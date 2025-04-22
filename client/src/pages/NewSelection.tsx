import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { Calendar, FileText, ArrowLeft, Boxes } from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Size } from "@shared/schema";

// Schema per la validazione del form
const formSchema = z.object({
  date: z.date({
    required_error: "La data è obbligatoria",
  }),
  purpose: z.enum(["vagliatura", "altro"], {
    required_error: "Lo scopo è obbligatorio",
  }),
  screeningType: z.enum(["sopra_vaglio", "sotto_vaglio"]).optional(),
  referenceSizeId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewVagliaturaPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query per ottenere le taglie
  const { data: sizes, isLoading: sizesLoading } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: async () => {
      return apiRequest<Size[]>({ url: '/api/sizes', method: 'GET' });
    },
  });

  // Form con validazione Zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      purpose: "vagliatura",
      notes: "",
    },
  });

  // Gestione del submit del form
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);

    try {
      // Formattazione dei dati per l'API
      const payload = {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
      };

      // Chiamata all'API per creare una nuova vagliatura
      const response = await fetch("/api/selections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Errore nella creazione della vagliatura");
      }

      const data = await response.json();

      // Redirect alla pagina di dettaglio
      toast({
        title: "Vagliatura creata",
        description: `Vagliatura #${data.selectionNumber} creata con successo`,
      });

      // Assicuriamoci che data.id esista e sia un numero valido
      if (data && data.id && !isNaN(Number(data.id))) {
        navigate(`/selection/${data.id}`);
      } else {
        console.error("ID vagliatura non valido:", data);
        toast({
          title: "Attenzione",
          description: "Vagliatura creata ma impossibile visualizzare i dettagli. Torna all'elenco.",
          variant: "destructive",
        });
        navigate("/selection");
      }
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della vagliatura",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Monitora i cambiamenti nel campo "purpose" per gestire il campo "screeningType"
  const watchPurpose = form.watch("purpose");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Vagliatura", href: "/selection" },
              { label: "Nuova Vagliatura", href: "/selection/new" },
            ]}
          />
          <PageHeading
            title="Nuova Vagliatura"
            description="Crea una nuova operazione di vagliatura"
            icon={<FileText className="h-6 w-6" />}
            className="mt-2"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/selection")}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna all'elenco
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Vagliatura</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data vagliatura */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Vagliatura</FormLabel>
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
                                format(field.value, "d MMMM yyyy", {
                                  locale: it,
                                })
                              ) : (
                                <span>Seleziona data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("2020-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Data in cui viene eseguita l'operazione di vagliatura
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Scopo */}
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scopo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona lo scopo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vagliatura">Vagliatura</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Motivazione per cui viene effettuata la vagliatura
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipo di vaglio (solo se scopo = vagliatura) */}
                {watchPurpose === "vagliatura" && (
                  <FormField
                    control={form.control}
                    name="screeningType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo di Vaglio</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona il tipo di vaglio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sopra_vaglio">
                              Sopra Vaglio
                            </SelectItem>
                            <SelectItem value="sotto_vaglio">
                              Sotto Vaglio
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Specifica il tipo di vagliatura da effettuare
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Taglia di riferimento */}
                <FormField
                  control={form.control}
                  name="referenceSizeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taglia di Riferimento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una taglia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizesLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full mt-2" />
                              <Skeleton className="h-4 w-full mt-2" />
                            </div>
                          ) : sizes && sizes.length > 0 ? (
                            sizes.map((size) => (
                              <SelectItem key={size.id} value={size.id.toString()}>
                                {size.name} ({size.code})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              Nessuna taglia disponibile
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Taglia di riferimento per questa vagliatura
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note o informazioni aggiuntive..."
                          {...field}
                          className="resize-y min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/selection")}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creazione in corso..." : "Procedi"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start">
          <Boxes className="h-5 w-5 text-primary mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium mb-1">Informazioni sul processo di vagliatura</h3>
            <p className="text-sm text-muted-foreground">
              Dopo aver creato la vagliatura, potrai selezionare le ceste di origine per l'operazione. 
              Successivamente, potrai creare le ceste di destinazione con i conteggi precisi degli animali.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Importante:</strong> La taglia di riferimento ti aiuta a selezionare le ceste di origine più appropriate per questa operazione. 
              Le ceste con taglia simile saranno proposte per prime durante la vagliatura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}