/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ClientSelector } from '@/components/sales/ClientSelector';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { SaleCart } from '@/components/sales/SaleCart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lock, ShoppingCart } from 'lucide-react';
import type { CartItem } from '@/types/sales';
import { ventaService } from '@/services/ventaService';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatErrorMessage } from '@/lib/axios-error';

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const NewSale = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === "VENDEDOR";
  const isAlmacenero = currentRole === "ALMACENERO";
  const navigate = useNavigate();
  const [isCajaCerradaModalOpen, setIsCajaCerradaModalOpen] = useState(false);
  const [tipoOrigen, setTipoOrigen] = useState<'RUTA' | 'FABRICA'>(currentRole === 'ALMACENERO' ? 'FABRICA' : 'RUTA');
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
  const [notaPedido, setNotaPedido] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ metodo_pago: string; monto: number; banco?: string; numero_operacion?: string }[]>([]);
  const [isLoadingVendedores, setIsLoadingVendedores] = useState(true);
  const [fechaVenta, setFechaVenta] = useState(getTodayString());

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
    tipo_venta: 'UNIDAD' | 'GRANEL';
    salida_id?: number | null;
    created_at: string;
    updated_at: string;
  }

  const fetchProductos = async (vendedorId: string) => {
    try {
      const data = await ventaService.getProductosByVendedor(vendedorId);

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

  const fetchProductosFabrica = async () => {
    try {
      const data = await ventaService.getProductosFabrica();

      const productosAdaptados = data.map((item: any) => ({
        ...item.producto,
        salida_id: null,
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

  const [isCartInView, setIsCartInView] = useState(false);

  useEffect(() => {
    const cartElement = document.getElementById('sale-cart-section');
    if (!cartElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCartInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(cartElement);
    return () => observer.disconnect();
  }, [cart.length]);

  const selectedVendedorObj = vendedores.find(v => String(v.id) === selectedVendedor);
  const targetVendedor = isVendedor ? vendedorActual : selectedVendedorObj;

  const allowRuta = isAlmacenero ? false : (targetVendedor ? (targetVendedor.venta_en_ruta ?? true) : true);
  const allowFabrica = isAlmacenero ? true : (targetVendedor ? (targetVendedor.venta_directa ?? false) : true);

  useEffect(() => {
    fetchClientes();
    fetchVendedores();
  }, []);

  useEffect(() => {
    if (tipoOrigen === 'FABRICA') {
      fetchProductosFabrica();
    } else if (selectedVendedor) {
      fetchProductos(selectedVendedor);
    } else {
      setProductos([]);
    }
  }, [tipoOrigen, selectedVendedor]);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setSelectedVendedor(String(vendedorActual.id));
    }
  }, [isVendedor, vendedorActual]);

  useEffect(() => {
    if (isAlmacenero) {
      if (tipoOrigen !== 'FABRICA') {
        setTipoOrigen('FABRICA');
      }
    } else if (targetVendedor) {
      const canRuta = targetVendedor.venta_en_ruta ?? true;
      const canFabrica = targetVendedor.venta_directa ?? false;
      if (!canRuta && canFabrica && tipoOrigen === 'RUTA') {
        setTipoOrigen('FABRICA');
      } else if (!canFabrica && canRuta && tipoOrigen === 'FABRICA') {
        setTipoOrigen('RUTA');
      }
    }
  }, [targetVendedor, tipoOrigen, isAlmacenero]);


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
        salida_id: product.salida_id ? Number(product.salida_id) : null,
        name: product.nombre,
        price: product.precio_base,
        quantity: 1,
        marca: product.marca,
        presentacion: product.presentacion,
        peso: product.peso,
        tipo_venta: product.tipo_venta,
        esBonificacion: false,
        esDegustacion: false,
      }]);
    }

    toast.success(`${product.nombre} agregado al carrito`);
  };

  const addBonificacion = (product: Producto) => {
    const bonificacionId = `${product.id}-bonif`;
    const existingBonif = cart.find(i => i.productId === bonificacionId);

    if (existingBonif) {
      setCart(cart.map(item =>
        item.productId === bonificacionId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: bonificacionId,
        salida_id: product.salida_id ? Number(product.salida_id) : null,
        name: product.nombre,
        price: 0,
        quantity: 1,
        marca: product.marca,
        presentacion: product.presentacion,
        peso: product.peso,
        tipo_venta: product.tipo_venta,
        esBonificacion: true,
        esDegustacion: false,
      }]);
    }

    toast.success(`Bonificación de ${product.nombre} agregada`);
  };

  const addDegustacion = (product: Producto) => {
    const degustacionId = `${product.id}-degust`;
    const existingDegust = cart.find(i => i.productId === degustacionId);

    if (existingDegust) {
      setCart(cart.map(item =>
        item.productId === degustacionId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: degustacionId,
        salida_id: product.salida_id ? Number(product.salida_id) : null,
        name: product.nombre,
        price: 0,
        quantity: 1,
        marca: product.marca,
        presentacion: product.presentacion,
        peso: product.peso,
        tipo_venta: product.tipo_venta,
        esBonificacion: false,
        esDegustacion: true,
      }]);
    }

    toast.success(`Degustación de ${product.nombre} agregada`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, quantity);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updatePrice = (productId: string, price: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newPrice = Math.max(0, price);
        return { ...item, price: newPrice };
      }
      return item;
    }));
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
        tipo_venta: item.tipo_venta,
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
        tipo_venta: item.tipo_venta,
        esBonificacion: false, esDegustacion: true,
      }]);
      toast.success(`Degustación de ${item.name} agregada`);
    }
  };

  const handleSubmit = async () => {
    if (fechaVenta && fechaVenta > getTodayString()) {
      toast.error('La fecha de venta no puede ser posterior a hoy');
      return;
    }
    if (!selectedClient) { toast.error('Selecciona un cliente'); return; }
    if (!selectedVendedor) { toast.error('Selecciona un vendedor'); return; }
    if (paymentType === 'CREDITO' && !notaPedido.trim()) {
      toast.error('La Nota de Pedido es requerida para ventas al crédito');
      return;
    }

    const hasDegustacion = cart.some(item => item.esDegustacion);
    if (cart.length === 0) {
      toast.error('Agrega productos al carrito');
      return;
    }

    if (regularItems.length === 0 && !hasDegustacion) {
      toast.error('Agrega productos al carrito');
      return;
    }

    if (paymentType === 'CREDITO' && total === 0) {
      toast.error('No se puede crear una venta al crédito con total cero (por ejemplo, con solo degustaciones).');
      return;
    }

    if (total === 0 && !hasDegustacion) {
      toast.error('El total no puede ser cero a menos que la venta incluya al menos una degustación.');
      return;
    }

    try {
      await ventaService.create({
        cliente_id: Number(selectedClient),
        vendedor_id: Number(selectedVendedor),
        tipo_pago: paymentType,
        metodo_pago_detalle: isSplitPayment ? splitPayments.map(p => p.metodo_pago).join(', ') : metodoPago,
        adelanto: paymentType === 'CREDITO' ? adelanto : 0,
        subtotal: subtotal,
        descuento: discount,
        total_neto: total,
        nota_pedido: paymentType === 'CREDITO' ? notaPedido.trim() : null,
        fecha: fechaVenta,
        items: cart.map(item => ({
          producto_id: Number(String(item.productId).split('-')[0]),
          salida_id: item.salida_id ? Number(item.salida_id) : null,
          cantidad: Number(item.quantity),
          precio_unitario: Number(item.price),
          subtotal: Number(item.price) * Number(item.quantity),
          es_bonificacion: item.esBonificacion || false,
          es_degustacion: item.esDegustacion || false,
        })),
        pagos: isSplitPayment ? splitPayments : undefined,
      });
      toast.success('Venta creada exitosamente');
      setCart([]);
      setSelectedClient('');
      setDiscount(0);
      setAdelanto(0);
      setNotaPedido('');
      setMetodoPago('efectivo');
      setIsSplitPayment(false);
      setSplitPayments([]);
      setFechaVenta(getTodayString());

      // Actualizar el stock de productos y los clientes
      if (tipoOrigen === 'FABRICA') {
        fetchProductosFabrica();
      } else if (selectedVendedor) {
        fetchProductos(selectedVendedor);
      }
      fetchClientes();
    } catch (error: any) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);

      const errorMessage = error.response?.data?.message || '';
      const isCajaCerrada = error.response?.status === 403 &&
        (errorMessage.toLowerCase().includes('caja abierta') ||
          errorMessage.toLowerCase().includes('caja cerrada'));

      if (isCajaCerrada) {
        setIsCajaCerradaModalOpen(true);
      } else {
        toast.error(formatErrorMessage('Error al crear venta', error, 'No se pudo crear la venta.'));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Nueva Venta</h1>
        <p className="text-muted-foreground mt-1">
          Registra una venta en ruta o directa desde la fábrica
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

          {/* Selector de Tipo de Venta: Ruta vs Fábrica */}
          <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up">
            <Label className="font-semibold block mb-3">Origen de la Venta</Label>
            <div className={`grid ${allowRuta && allowFabrica ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {allowRuta && (
                <Button
                  type="button"
                  variant={tipoOrigen === 'RUTA' ? 'default' : 'outline'}
                  className="flex items-center justify-center gap-2 py-5"
                  onClick={() => {
                    if (tipoOrigen !== 'RUTA') {
                      setTipoOrigen('RUTA');
                      setCart([]);
                    }
                  }}
                >
                  <span>🚚 Venta en Ruta (Vehículo)</span>
                </Button>
              )}
              {allowFabrica && (
                <Button
                  type="button"
                  variant={tipoOrigen === 'FABRICA' ? 'default' : 'outline'}
                  className="flex items-center justify-center gap-2 py-5"
                  onClick={() => {
                    if (tipoOrigen !== 'FABRICA') {
                      setTipoOrigen('FABRICA');
                      setCart([]);
                    }
                  }}
                >
                  <span>🏢 Venta Directa (Fábrica)</span>
                </Button>
              )}
              {!allowRuta && !allowFabrica && (
                <div className="text-center text-muted-foreground py-5 border rounded-lg border-dashed">
                  No tienes opciones de venta habilitadas.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Fecha de Venta</Label>
                <Input
                  type="date"
                  value={fechaVenta}
                  max={getTodayString()}
                  onChange={(e) => setFechaVenta(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Vendedor / Responsable</Label>
                {isLoadingVendedores ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Cargando...</span>
                  </div>
                ) : (
                  <Select value={selectedVendedor} onValueChange={setSelectedVendedor} disabled={isVendedor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vendedor / responsable..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAlmacenero ? vendedores.filter(v => Boolean(v.venta_directa)) : vendedores).map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.usuario?.nombre} ({v.id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <ClientSelector selectedClient={selectedClient} onClientChange={setSelectedClient} lista_clientes={clientes} />

          {/* Client credit info */}
          {selectedClientData && paymentType === 'CREDITO' && (
            <div className="bg-card rounded-xl border shadow-card p-3 sm:p-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex justify-between sm:block">
                  <p className="text-muted-foreground">Límite Crédito</p>
                  <p className="font-bold">S/ {(selectedClientData.limite_credito || 0).toLocaleString()}</p>
                </div>
                <div className="flex justify-between sm:block">
                  <p className="text-muted-foreground">Deuda Actual</p>
                  <p className="font-bold text-amber-600">S/ {(selectedClientData.deuda_actual || 0).toLocaleString()}</p>
                </div>
                <div className="flex justify-between sm:block">
                  <p className="text-muted-foreground">Disponible</p>
                  <p className={`font-bold ${(selectedClientData.limite_credito || 0) - (selectedClientData.deuda_actual || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    S/ {((selectedClientData.limite_credito || 0) - (selectedClientData.deuda_actual || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <ProductSearch
            onAddProduct={addToCart}
            onAddBonificacion={addBonificacion}
            onAddDegustacion={addDegustacion}
            lista_productos={productos}
          />
        </div>

        <div className="lg:col-span-1" id="sale-cart-section">
          <SaleCart
            cart={cart}
            paymentType={paymentType}
            discount={discount}
            metodoPago={metodoPago}
            adelanto={adelanto}
            notaPedido={notaPedido}
            onNotaPedidoChange={setNotaPedido}
            onPaymentTypeChange={(type) => {
              setPaymentType(type);
              if (type === 'CONTADO') {
                setAdelanto(0);
                setNotaPedido('');
              }
            }}
            onDiscountChange={setDiscount}
            onMetodoPagoChange={setMetodoPago}
            onAdelantoChange={setAdelanto}
            onUpdateQuantity={updateQuantity}
            onUpdatePrice={updatePrice}
            onRemoveItem={removeFromCart}
            onToggleBonificacion={toggleBonificacion}
            onToggleDegustacion={toggleDegustacion}
            onSubmit={handleSubmit}
            isClientSelected={!!selectedClient}
            isSubmitting={false}
            isSplitPayment={isSplitPayment}
            onIsSplitPaymentChange={setIsSplitPayment}
            splitPayments={splitPayments}
            onSplitPaymentsChange={setSplitPayments}
          />
        </div>
      </div>

      {/* Botón Flotante de Carrito en Móvil (Se oculta automáticamente al llegar al área del carrito / Registrar Venta) */}
      {cart.length > 0 && !isCartInView && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden animate-slide-up">
          <Button
            type="button"
            variant="gradient"
            className="w-full shadow-xl h-12 flex items-center justify-between px-4 text-xs sm:text-sm font-semibold rounded-xl"
            onClick={() => {
              const cartElem = document.getElementById('sale-cart-section');
              cartElem?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)
            </span>
            <span className="font-bold">
              Ver Carrito (S/ {total.toFixed(2)}) ↓
            </span>
          </Button>
        </div>
      )}

      {/* Modal de Caja Cerrada */}
      <Dialog open={isCajaCerradaModalOpen} onOpenChange={setIsCajaCerradaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 animate-bounce">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold font-display text-red-600 dark:text-red-400">
              Apertura de Caja Requerida
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-2">
              No se ha detectado una caja abierta para el día de hoy. Es indispensable contar con una caja abierta antes de realizar ventas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-center">
            {isVendedor || isAlmacenero ? (
              <div className="bg-muted p-4 rounded-lg text-sm font-medium border border-border text-left">
                Por favor, solicite a un <span className="text-primary font-bold">administrador, gerente, supervisor o cajero</span> que aperture la caja para continuar con la venta.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Como usuario administrador o de gestión, puede proceder a realizar la apertura de caja directamente en la vista de caja.
              </p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-center gap-2">
            {isVendedor || isAlmacenero ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCajaCerradaModalOpen(false)}
              >
                Entendido
              </Button>
            ) : (
              <div className="flex w-full gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCajaCerradaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="gradient"
                  className="gap-2"
                  onClick={() => {
                    setIsCajaCerradaModalOpen(false);
                    navigate('/caja');
                  }}
                >
                  Ir a la Vista de Caja
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale;
