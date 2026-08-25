import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RouteMap from '@/components/routes/RouteMap';
import { rutaService } from '@/services/rutaService';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/axios-error';

export const InteractiveMapPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialZoneId = searchParams.get('zoneId') || undefined;

  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRutas = async () => {
    setIsLoading(true);
    try {
      const data = await rutaService.getAll({ per_page: 100 });
      setRoutes(data.data || data);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudieron cargar las rutas para el mapa.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRutas();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Mapa Interactivo</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza y delimita geográficamente las rutas y zonas en el mapa
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[600px] bg-card rounded-xl border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <RouteMap
          routes={routes}
          onRoutesChange={setRoutes}
          initialZoneId={initialZoneId}
        />
      )}
    </div>
  );
};

export default InteractiveMapPage;
