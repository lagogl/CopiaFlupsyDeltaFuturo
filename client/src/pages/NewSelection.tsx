import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  LayoutDashboard,
  FileText,
  ArrowLeft,
  Save,
  Calendar as CalendarIcon
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Schema di validazione per il form
const selectionSchema = z.object({
  date: z.date({
    required_error: "La data è obbligatoria",
  }),
  purpose: z.string().min(1, "Lo scopo è obbligatorio"),
  screeningType: z.string().optional(),
  notes: z.string().optional(),
});

type SelectionFormValues = z.infer<typeof selectionSchema>;

export default function NewSelection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Configurazione del form con react-hook-form
  const form = useForm<SelectionFormValues>({
    resolver: zodResolver(selectionSchema),
    defaultValues: {
      date: new Date(),
      purpose: "",
      screeningType: "",
      notes: "",
    },
  });
  
  // Mutazione per creare una nuova selezione
  const createSelectionMutation = useMutation({
    mutationFn: async (data: SelectionFormValues) => {
      return apiRequest('/api/selections', {
        method: 'POST',
        data: {
          ...data,
          date: format(data.date, 'yyyy-MM-dd'),
          status: 'draft', // La selezione inizia come bozza
        },
      });
    },
    onSuccess: (data) => {
      // Invalida le query per aggiornare la cache
      queryClient.invalidateQueries({ queryKey: ['/api/selections'] });
      
      toast({
        title: "Selezione creata",
        description: `La selezione #${data.selection.selectionNumber} è stata creata con successo.`,
      });
      
      // Reindirizza alla pagina di dettaglio
      navigate(`/selection/${data.selection.id}`);
    },
    onError: (error) => {
      console.error("Errore durante la creazione della selezione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della selezione.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  const onSubmit = (data: SelectionFormValues) => {
    setIsSubmitting(true);
    createSelectionMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Selezioni", href: "/selection" },
          { label: "Nuova Selezione", href: "/selection/new" },
        ]}
      />
      
      <div className="flex items-center mt-2 mb-6">
        <Button variant="ghost" onClick={() => navigate('/selection')} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>
        
        <PageHeading
          title="Nuova Selezione"
          description="Crea una nuova operazione di selezione"
          icon={<FileText className="h-8 w-8 text-primary"/>}
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Selezione</CardTitle>
          <CardDescription>
            Inserisci le informazioni di base per la nuova operazione di selezione.
            Dopo aver creato la selezione, potrai aggiungere le ceste di origine e destinazione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo Data */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Operazione</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2023-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        La data in cui viene eseguita la selezione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Campo Scopo */}
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scopo Selezione</FormLabel>
                      <FormControl>
                        <Input placeholder="Es: Trasferimento per liberare spazio" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lo scopo principale per cui viene effettuata questa selezione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo di Vaglio */}
                <FormField
                  control={form.control}
                  name="screeningType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di Vaglio (opzionale)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona vaglio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TP-1000">TP-1000</SelectItem>
                          <SelectItem value="TP-1140">TP-1140</SelectItem>
                          <SelectItem value="TP-1260">TP-1260</SelectItem>
                          <SelectItem value="TP-1500">TP-1500</SelectItem>
                          <SelectItem value="TP-1800">TP-1800</SelectItem>
                          <SelectItem value="TP-2000">TP-2000</SelectItem>
                          <SelectItem value="TP-2500">TP-2500</SelectItem>
                          <SelectItem value="TP-3000">TP-3000</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Se utilizzato, specifica il tipo di vaglio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Note */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note o osservazioni"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Note aggiuntive sull'operazione di selezione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <CardFooter className="flex justify-between px-0 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/selection')}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvataggio..." : "Crea Selezione"}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}