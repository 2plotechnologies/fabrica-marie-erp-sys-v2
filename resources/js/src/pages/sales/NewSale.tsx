/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ClientSelector } from '@/components/sales/ClientSelector';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { SaleCart } from '@/components/sales/SaleCart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { CartItem } from '@/types/sales';
import { ventaService } from '@/services/ventaService';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

const NewSale = () => {
  const { currentRole, roleLabels } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === "VENDEDOR";
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [discount, setDiscount] = useState(0);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [adelanto, setAdelanto] = useState(0);
  const [isLoadingVendedores, setIsLoadingVendedores] = useState(true);

  interface Producto {
    id: string;
    sku: string;
    nombre: string;
    descripcion: string | null;
    marca: string | null;
    presentacion: string | null;
    peso: number | null;
    precio_base: number;
    costo: number;
    categoria: string;
    estado: string;
    salida_id: number;
    created_at: string;
    updated_at: string;
  }

  const fetchProductos = async (vendedorId: string) => {
    try {
      const data = await ventaService.getProductosByVendedor(vendedorId);

      console.log(data);

      // Adaptar datos al formato que usa ProductSearch
      const productosAdaptados = data.map((item: any) => ({
        ...item.producto,
        salida_id: item.salida_id,
        stock: item.cantidad - item.stock_reservado
      }));

      setProductos(productosAdaptados);

    } catch (error) {
      console.log(error);
    }
  };

  const fetchClientes = async () => {
    try {
      const data = await ventaService.getClientes();
      setClientes(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await ventaService.getVendedores();
      setVendedores(data);
      setIsLoadingVendedores(false);
    } catch (error) {
      console.log(error);
    }
  };

  const vendedorActual = vendedores.find(
    v => v.usuario_id === user?.id
  );

  useEffect(() => {
    fetchClientes();
    fetchVendedores();
  }, []);

  useEffect(() => {
    if (selectedVendedor) {
      fetchProductos(selectedVendedor);
    }
  }, [selectedVendedor]);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setSelectedVendedor(String(vendedorActual.id));
    }
  }, [isVendedor, vendedorActual]);


  // Credit limit warning
  const selectedClientData = clientes.find(c => c.id === selectedClient);
  const regularItems = cart.filter(item => !item.esBonificacion && !item.esDegustacion);
  const subtotal = regularItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const showCreditWarning = paymentType === 'CREDITO' && selectedClientData &&
    ((selectedClientData.deuda_actual || 0) + total - adelanto) > (selectedClientData.limite_credito || 0);

  const addToCart = (product: Producto) => {
    const existingItem = cart.find(
      item => item.productId === product.id && !item.esBonificacion && !item.esDegustacion
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id && !item.esBonificacion && !item.esDegustacion
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        salida_id: Number(product.salida_id),
        name: product.nombre,
        price: product.precio_base,
        quantity: 1,
        marca: product.marca,
        presentacion: product.presentacion,
        peso: product.peso,
        esBonificacion: false,
        esDegustacion: false,
      }]);
    }

    toast.success(`${product.nombre} agregado al carrito`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const toggleBonificacion = (productId: string) => {
    const item = cart.find(i => i.productId === productId && !i.esBonificacion && !i.esDegustacion);
    if (!item) return;
    const bonificacionId = `${productId}-bonif`;
    const existingBonif = cart.find(i => i.productId === bonificacionId);

    if (existingBonif) {
      setCart(cart.filter(i => i.productId !== bonificacionId));
    } else {
      setCart([...cart, {
        productId: bonificacionId, name: item.name, price: 0, quantity: 1,
        salida_id: item.salida_id,
        marca: item.marca, presentacion: item.presentacion, peso: item.peso,
        esBonificacion: true, esDegustacion: false,
      }]);
      toast.success(`Bonificación de ${item.name} agregada`);
    }
  };

  const toggleDegustacion = (productId: string) => {
    const item = cart.find(i => i.productId === productId && !i.esBonificacion && !i.esDegustacion);
    if (!item) return;
    const degustacionId = `${productId}-degust`;
    const existingDegust = cart.find(i => i.productId === degustacionId);

    if (existingDegust) {
      setCart(cart.filter(i => i.productId !== degustacionId));
    } else {
      setCart([...cart, {
        productId: degustacionId, name: item.name, price: 0, quantity: 1,
        salida_id: item.salida_id,
        marca: item.marca, presentacion: item.presentacion, peso: item.peso,
        esBonificacion: false, esDegustacion: true,
      }]);
      toast.success(`Degustación de ${item.name} agregada`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) { toast.error('Selecciona un cliente'); return; }
    if (!selectedVendedor) { toast.error('Selecciona un vendedor'); return; }

    if (regularItems.length === 0) { toast.error('Agrega productos al carrito'); return; }

    try {
      await ventaService.create({
        cliente_id: Number(selectedClient),
        vendedor_id: Number(selectedVendedor),
        tipo_pago: paymentType,
        metodo_pago_detalle: metodoPago,
        adelanto: paymentType === 'CREDITO' ? adelanto : 0,
        subtotal: subtotal,
        descuento: discount,
        total_neto: total,
        items: cart.map(item => ({
          producto_id: Number(String(item.productId).split('-')[0]),
          salida_id: Number(item.salida_id),
          cantidad: Number(item.quantity),
          precio_unitario: Number(item.price),
          subtotal: Number(item.price) * Number(item.quantity),
          es_bonificacion: item.esBonificacion || false,
          es_degustacion: item.esDegustacion || false,
        })),
      });
      toast.success('Venta creada exitosamente');
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al crear venta: " + error.response?.data.message || error?.message || "Error al crear venta desconocido.");
    }

    setCart([]);
    setSelectedClient('');
    setDiscount(0);
    setAdelanto(0);
    setMetodoPago('efectivo');
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Nueva Venta</h1>
        <p className="text-muted-foreground mt-1">
          Registra una venta con productos, bonificaciones y degustaciones
        </p>
      </div>

      {/* Credit limit warning */}
      {showCreditWarning && (
        <Alert variant="destructive" className="animate-fade-in border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Límite de crédito excedido</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Deuda actual: S/ {(selectedClientData?.deuda_actual || 0).toLocaleString()} +
            Monto venta: S/ {(total - adelanto).toLocaleString()} =
            S/ {((selectedClientData?.deuda_actual || 0) + total - adelanto).toLocaleString()}
            {' '}(Límite: S/ {(selectedClientData?.limite_credito || 0).toLocaleString()}).
            Puede continuar, pero el cliente supera su límite.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up">
            <div className="space-y-2">
              <Label className="font-semibold">Vendedor</Label>
              {isLoadingVendedores ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : (
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor} disabled={isVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.usuario?.nombre} ({v.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <ClientSelector selectedClient={selectedClient} onClientChange={setSelectedClient} lista_clientes={clientes} />

          {/* Client credit info */}
          {selectedClientData && paymentType === 'CREDITO' && (
            <div className="bg-card rounded-xl border shadow-card p-4 animate-fade-in">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Límite Crédito</p>
                  <p className="font-bold">S/ {(selectedClientData.limite_credito || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deuda Actual</p>
                  <p className="font-bold text-amber-600">S/ {(selectedClientData.deuda_actual || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disponible</p>
                  <p className={`font-bold ${(selectedClientData.limite_credito || 0) - (selectedClientData.deuda_actual || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    S/ {((selectedClientData.limite_credito || 0) - (selectedClientData.deuda_actual || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <ProductSearch onAddProduct={addToCart} lista_productos={productos} />
        </div>

        <div className="lg:col-span-1">
          <SaleCart
            cart={cart}
            paymentType={paymentType}
            discount={discount}
            metodoPago={metodoPago}
            adelanto={adelanto}
            onPaymentTypeChange={(type) => {
              setPaymentType(type);
              if (type === 'CONTADO') setAdelanto(0);
            }}
            onDiscountChange={setDiscount}
            onMetodoPagoChange={setMetodoPago}
            onAdelantoChange={setAdelanto}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onToggleBonificacion={toggleBonificacion}
            onToggleDegustacion={toggleDegustacion}
            onSubmit={handleSubmit}
            isClientSelected={!!selectedClient}
            isSubmitting={false}
          />
        </div>
      </div>
    </div>
  );
};

export default NewSale;
