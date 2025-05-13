import React from 'react';
import { Helmet } from 'react-helmet';
import { NullRowFixer } from '@/components/admin/NullRowFixer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';

/**
 * Pagina di amministrazione con utility per la manutenzione del sistema
 */
export function AmministrazioneUtilita() {
  return (
    <>
      <Helmet>
        <title>Utilità di Amministrazione - FLUPSY Manager</title>
      </Helmet>

      <div className="container mx-auto py-4">
        <PageHeader
          title="Utilità di Amministrazione"
          description="Strumenti di manutenzione e correzione per amministratori di sistema"
        />

        <Tabs defaultValue="fix-null-rows" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="fix-null-rows">Correzione File Null</TabsTrigger>
            {/* Altre utility future possono essere aggiunte qui */}
          </TabsList>

          <TabsContent value="fix-null-rows">
            <NullRowFixer />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default AmministrazioneUtilita;