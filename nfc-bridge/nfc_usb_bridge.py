#!/usr/bin/env python3
"""
NFC USB Bridge - Ponte locale per lettori NFC USB
Supporta: NFC Tool Pro e altri lettori compatibili PC/SC

Requisiti:
  pip install websockets pyscard

Uso:
  python nfc_usb_bridge.py
"""

import asyncio
import json
import logging
import sys
from datetime import datetime
from typing import Optional, Dict, Any

try:
    import websockets
    from smartcard.System import readers
    from smartcard.util import toHexString
    from smartcard.CardMonitoring import CardMonitor, CardObserver
except ImportError as e:
    print(f"❌ Errore: {e}")
    print("\n📦 Installa le dipendenze:")
    print("   pip install websockets pyscard")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurazione
WEBSOCKET_PORT = 8765
WEBSOCKET_HOST = "localhost"

class NFCBridge:
    """Bridge tra lettore NFC USB e WebSocket"""
    
    def __init__(self):
        self.connected_clients = set()
        self.current_tag = None
        self.card_monitor = None
        
    async def broadcast(self, message: Dict[str, Any]):
        """Invia messaggio a tutti i client connessi"""
        if self.connected_clients:
            message_json = json.dumps(message)
            await asyncio.gather(
                *[client.send(message_json) for client in self.connected_clients],
                return_exceptions=True
            )
            logger.info(f"📡 Broadcast a {len(self.connected_clients)} client(i): {message['type']}")
    
    async def handle_client(self, websocket, path):
        """Gestisce connessione WebSocket da client web"""
        logger.info(f"🔌 Client connesso: {websocket.remote_address}")
        self.connected_clients.add(websocket)
        
        try:
            # Invia stato iniziale
            await websocket.send(json.dumps({
                'type': 'connected',
                'message': 'Bridge NFC USB connesso',
                'readers': self.get_readers_info()
            }))
            
            # Gestisci messaggi dal client
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error(f"❌ Messaggio JSON non valido: {message}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("🔌 Client disconnesso")
        finally:
            self.connected_clients.remove(websocket)
    
    async def handle_message(self, websocket, data: Dict[str, Any]):
        """Gestisce comandi dal client web"""
        msg_type = data.get('type')
        
        if msg_type == 'ping':
            await websocket.send(json.dumps({'type': 'pong'}))
            
        elif msg_type == 'write_tag':
            # Scrittura tag NFC
            tag_data = data.get('data')
            request_id = data.get('request_id')
            result = await self.write_tag(tag_data, request_id)
            await websocket.send(json.dumps({
                'type': 'write_result',
                'success': result.get('success'),
                'message': result.get('message'),
                'request_id': result.get('request_id'),
                'bytes_written': result.get('bytes_written'),
                'pages_written': result.get('pages_written')
            }))
            
        elif msg_type == 'get_readers':
            await websocket.send(json.dumps({
                'type': 'readers_list',
                'readers': self.get_readers_info()
            }))
    
    def get_readers_info(self) -> list:
        """Ottiene lista lettori NFC disponibili"""
        try:
            r = readers()
            return [{'name': str(reader), 'index': i} for i, reader in enumerate(r)]
        except Exception as e:
            logger.error(f"❌ Errore lettura dispositivi: {e}")
            return []
    
    def detect_tag_type(self, connection) -> Dict[str, Any]:
        """Rileva tipo e capacità del tag NFC"""
        try:
            # GET VERSION (NTAG/Ultralight EV1)
            GET_VERSION = [0xFF, 0x00, 0x00, 0x00, 0x01, 0x60]
            try:
                data, sw1, sw2 = connection.transmit(GET_VERSION)
                if sw1 == 0x90 and sw2 == 0x00 and len(data) >= 7:
                    # NTAG rilevato
                    storage_size = data[6]
                    capacities = {0x0F: 144, 0x11: 504, 0x13: 888}  # NTAG213/215/216
                    capacity = capacities.get(storage_size, 144)
                    return {
                        'type': 'NTAG',
                        'version': f"{data[2]}.{data[3]}",
                        'storage_size': storage_size,
                        'capacity_bytes': capacity,
                        'start_page': 4,
                        'bytes_per_page': 4
                    }
            except:
                pass
            
            # Fallback: assume MIFARE Ultralight classico
            logger.warning("GET VERSION fallito - assumo MIFARE Ultralight classico")
            return {
                'type': 'MIFARE_UL',
                'version': 'unknown',
                'capacity_bytes': 48,  # Conservativo
                'start_page': 4,
                'bytes_per_page': 4
            }
            
        except Exception as e:
            logger.error(f"❌ Errore detection tag: {e}")
            return {
                'type': 'UNKNOWN',
                'capacity_bytes': 48,  # Molto conservativo
                'start_page': 4,
                'bytes_per_page': 4
            }
    
    async def write_tag(self, tag_data: Dict[str, Any], request_id: str = None) -> Dict[str, Any]:
        """Scrive dati su tag NFC con auto-detection tipo"""
        try:
            r = readers()
            if not r:
                return {
                    'success': False, 
                    'message': 'Nessun lettore NFC trovato',
                    'request_id': request_id
                }
            
            # Usa il primo lettore disponibile
            reader = r[0]
            connection = reader.createConnection()
            connection.connect()
            
            # Rileva tipo di tag
            tag_info = self.detect_tag_type(connection)
            logger.info(f"🏷️  Tag rilevato: {tag_info['type']} (capacità: {tag_info['capacity_bytes']} bytes)")
            
            # Converti dati in formato JSON
            json_data = json.dumps(tag_data)
            data_size = len(json_data.encode('utf-8'))
            
            logger.info(f"✍️  Scrittura su tag NFC tramite {reader}")
            logger.info(f"   Dati: {json_data[:80]}{'...' if len(json_data) > 80 else ''}")
            logger.info(f"   Dimensione: {data_size} bytes, Capacità tag: {tag_info['capacity_bytes']} bytes")
            
            # Verifica capacità tag
            if data_size > tag_info['capacity_bytes']:
                raise Exception(
                    f"Payload troppo grande ({data_size} bytes) per tag {tag_info['type']} "
                    f"(capacità: {tag_info['capacity_bytes']} bytes)"
                )
            
            # Preparazione messaggio NDEF Text Record
            text_bytes = json_data.encode('utf-8')
            
            # NDEF Text Record Header
            ndef_header = 0xD1  # MB=1, ME=1, SR=1, TNF=1
            type_length = 0x01
            type_field = ord('T')
            
            # Status byte con language code "it"
            # Bit 7 = 0 (UTF-8), Bit 6 = 0 (reserved), Bits 0-5 = lunghezza language code (2)
            status_byte = 0x02  # UTF-8, 2 byte language code
            language_code = b'it'  # ISO 639-1 code
            
            payload_length = 1 + len(language_code) + len(text_bytes)  # status + lang + text
            
            ndef_message = bytes([
                ndef_header,
                type_length,
                payload_length,
                type_field,
                status_byte
            ]) + language_code + text_bytes
            
            # TLV wrapping per NDEF
            tlv_type = 0x03
            tlv_length = len(ndef_message)
            tlv_terminator = 0xFE
            
            full_message = bytes([tlv_type, tlv_length]) + ndef_message + bytes([tlv_terminator])
            
            # Padding a multipli di bytes_per_page
            bytes_per_page = tag_info['bytes_per_page']
            padded_message = full_message + bytes([0] * ((-len(full_message)) % bytes_per_page))
            
            # Scrivi pagina per pagina
            start_page = tag_info['start_page']
            for i in range(0, len(padded_message), bytes_per_page):
                page_num = start_page + (i // bytes_per_page)
                page_data = list(padded_message[i:i+bytes_per_page])
                
                # APDU Write: FF D6 00 [page] [size] [data...]
                write_apdu = [0xFF, 0xD6, 0x00, page_num, bytes_per_page] + page_data
                
                data, sw1, sw2 = connection.transmit(write_apdu)
                
                if sw1 != 0x90 or sw2 != 0x00:
                    raise Exception(f"Errore scrittura pagina {page_num}: {sw1:02X} {sw2:02X}")
                    
                logger.info(f"   Pagina {page_num} scritta: {' '.join(f'{b:02X}' for b in page_data)}")
            
            logger.info(f"✅ Tag {tag_info['type']} scritto: {data_size} bytes in {len(padded_message)//bytes_per_page} pagine")
            
            return {
                'success': True,
                'message': f"Tag {tag_info['type']} scritto ({data_size} bytes)",
                'bytes_written': data_size,
                'pages_written': len(padded_message) // bytes_per_page,
                'tag_type': tag_info['type'],
                'tag_capacity': tag_info['capacity_bytes'],
                'request_id': request_id
            }
            
        except Exception as e:
            logger.error(f"❌ Errore scrittura tag: {e}", exc_info=True)
            return {
                'success': False, 
                'message': f'Errore: {str(e)}',
                'request_id': request_id
            }
    
    async def start_card_monitoring(self):
        """Avvia monitoraggio carte NFC"""
        
        class NFCCardObserver(CardObserver):
            def __init__(self, bridge):
                self.bridge = bridge
                
            def update(self, observable, actions):
                (addedcards, removedcards) = actions
                
                for card in addedcards:
                    # Tag rilevato
                    asyncio.create_task(self.on_card_inserted(card))
                    
                for card in removedcards:
                    # Tag rimosso
                    asyncio.create_task(self.on_card_removed(card))
            
            async def on_card_inserted(self, card):
                try:
                    connection = card.createConnection()
                    connection.connect()
                    
                    # Leggi UID del tag (APDU standard)
                    GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
                    data, sw1, sw2 = connection.transmit(GET_UID)
                    
                    if sw1 == 0x90 and sw2 == 0x00:
                        uid = toHexString(data).replace(' ', ':')
                        logger.info(f"📱 Tag rilevato: {uid}")
                        
                        # Broadcast evento al web
                        await self.bridge.broadcast({
                            'type': 'nfc_detected',
                            'serialNumber': uid,
                            'timestamp': datetime.now().isoformat(),
                            'reader': str(card.reader)
                        })
                        
                        self.bridge.current_tag = uid
                    else:
                        logger.warning(f"⚠️ Errore lettura UID: {sw1:02X} {sw2:02X}")
                        
                except Exception as e:
                    logger.error(f"❌ Errore lettura carta: {e}")
            
            async def on_card_removed(self, card):
                logger.info("📱 Tag rimosso")
                await self.bridge.broadcast({
                    'type': 'nfc_removed',
                    'timestamp': datetime.now().isoformat()
                })
                self.bridge.current_tag = None
        
        # Avvia monitoraggio
        logger.info("🔍 Avvio monitoraggio tag NFC...")
        self.card_monitor = CardMonitor()
        observer = NFCCardObserver(self)
        self.card_monitor.addObserver(observer)
    
    async def run(self):
        """Avvia il bridge"""
        logger.info("=" * 60)
        logger.info("🚀 NFC USB Bridge - Avvio")
        logger.info("=" * 60)
        
        # Verifica lettori disponibili
        r = readers()
        if not r:
            logger.error("❌ ERRORE: Nessun lettore NFC trovato!")
            logger.error("   Verifica che:")
            logger.error("   1. Il lettore NFC Tool Pro sia collegato via USB")
            logger.error("   2. I driver siano installati correttamente")
            logger.error("   3. Il lettore sia visibile in Gestione Dispositivi")
            return
        
        logger.info(f"✅ Lettori NFC trovati: {len(r)}")
        for i, reader in enumerate(r):
            logger.info(f"   {i+1}. {reader}")
        
        # Avvia monitoraggio carte
        await self.start_card_monitoring()
        
        # Avvia server WebSocket
        logger.info(f"🌐 Server WebSocket: ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        logger.info("✅ Bridge attivo - in attesa di connessioni...")
        logger.info("-" * 60)
        
        async with websockets.serve(self.handle_client, WEBSOCKET_HOST, WEBSOCKET_PORT):
            await asyncio.Future()  # run forever

async def main():
    """Entry point"""
    bridge = NFCBridge()
    
    try:
        await bridge.run()
    except KeyboardInterrupt:
        logger.info("\n⛔ Bridge interrotto dall'utente")
    except Exception as e:
        logger.error(f"❌ Errore fatale: {e}", exc_info=True)
    finally:
        if bridge.card_monitor:
            bridge.card_monitor.clearObservers()

if __name__ == "__main__":
    asyncio.run(main())
