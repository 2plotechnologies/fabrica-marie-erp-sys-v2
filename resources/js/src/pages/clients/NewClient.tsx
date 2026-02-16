/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteService } from '@/services/clienteService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building2, Phone, CreditCard, Save, ArrowLeft } from 'lucide-react';

interface Ruta {
  id: number;
  nombre: string;
  zona?: string;
}

const NewClient = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [formErrors, setFormErrors] = useState<any>({});

  const [formData, setFormData] = useState({
    codigo_cliente: '',
    razon_social: '',
    tipo_cliente: '',
    direccion: '',
    telefono: '',
    ruta_id: '',
    condicion_pago: 'CONTADO',
    limite_credito: '',
    dias_credito: '',
    activo: true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 🔹 Cargar rutas
  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const data = await clienteService.getRutas();
        setRutas(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "No se pudieron cargar las rutas.",
          variant: "destructive",
        });
      } finally {
        setLoadingRoutes(false);
      }
    };

    fetchRutas();
  }, []);

  // 🔹 Crear cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    try {
      const payload = {
        ...formData,
        ruta_id: formData.ruta_id ? Number(formData.ruta_id) : null,
        limite_credito:
          formData.condicion_pago === 'CREDITO'
            ? Number(formData.limite_credito || 0)
            : 0,
        dias_credito:
          formData.condicion_pago === 'CREDITO'
            ? Number(formData.dias_credito || 0)
            : 0,
        activo: true,
      };

      const data = await clienteService.create(payload);

      toast({
        title: "Cliente creado",
        description: `${data.razon_social} fue registrado correctamente.`,
      });

      navigate('/clientes/lista');

    } catch (error: any) {

      // 🔹 Error de validación Laravel (422)
      if (error?.errors) {
        setFormErrors(error.errors);

        toast({
          title: "Error de validación",
          description: "Revisa los campos del formulario.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "No se pudo registrar el cliente.",
          variant: "destructive",
        });
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Información */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Información
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label>Código Cliente *</Label>
                <Input
                  value={formData.codigo_cliente}
                  onChange={(e) =>
                    handleInputChange('codigo_cliente', e.target.value)
                  }
                />
                {formErrors.codigo_cliente && (
                  <p className="text-sm text-red-500">
                    {formErrors.codigo_cliente[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Razón Social *</Label>
                <Input
                  value={formData.razon_social}
                  onChange={(e) =>
                    handleInputChange('razon_social', e.target.value)
                  }
                />
                {formErrors.razon_social && (
                  <p className="text-sm text-red-500">
                    {formErrors.razon_social[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo Cliente</Label>
                <Select
                  value={formData.tipo_cliente}
                  onValueChange={(v) =>
                    handleInputChange('tipo_cliente', v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIENDA">TIENDA</SelectItem>
                    <SelectItem value="DISTRIBUIDOR">DISTRIBUIDOR</SelectItem>
                    <SelectItem value="MAYORISTA">MAYORISTA</SelectItem>
                    <SelectItem value="CONSUMIDOR">CONSUMIDOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) =>
                    handleInputChange('telefono', e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.direccion}
                  onChange={(e) =>
                    handleInputChange('direccion', e.target.value)
                  }
                />
              </div>

            </CardContent>
          </Card>

          {/* Configuración Comercial */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Configuración Comercial
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">
                <Label>Ruta</Label>
                <Select
                  value={formData.ruta_id}
                  onValueChange={(v) =>
                    handleInputChange('ruta_id', v)
                  }
                  disabled={loadingRoutes}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingRoutes
                          ? "Cargando rutas..."
                          : "Seleccionar ruta"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas.map((ruta) => (
                      <SelectItem
                        key={ruta.id}
                        value={ruta.id.toString()}
                      >
                        {ruta.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condición de Pago *</Label>
                <Select
                  value={formData.condicion_pago}
                  onValueChange={(v) =>
                    handleInputChange('condicion_pago', v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTADO">CONTADO</SelectItem>
                    <SelectItem value="CREDITO">CRÉDITO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.condicion_pago === 'CREDITO' && (
                <>
                  <div className="space-y-2">
                    <Label>Límite Crédito</Label>
                    <Input
                      type="number"
                      value={formData.limite_credito}
                      onChange={(e) =>
                        handleInputChange('limite_credito', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Días Crédito</Label>
                    <Input
                      type="number"
                      value={formData.dias_credito}
                      onChange={(e) =>
                        handleInputChange('dias_credito', e.target.value)
                      }
                    />
                  </div>
                </>
              )}

            </CardContent>
          </Card>

        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Cliente"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewClient;
