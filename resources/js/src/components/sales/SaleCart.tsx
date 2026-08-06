import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Gift,
  Coffee,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CartItem } from '@/types/sales';

export interface SplitPaymentRow {
  metodo_pago: string;
  monto: number;
  banco?: string;
  numero_operacion?: string;
}

interface SaleCartProps {
  cart: CartItem[];
  paymentType: 'CONTADO' | 'CREDITO';
  discount: number;
  metodoPago: string;
  adelanto: number;
  onPaymentTypeChange: (type: 'CONTADO' | 'CREDITO') => void;
  onDiscountChange: (discount: number) => void;
  onMetodoPagoChange: (metodo: string) => void;
  onAdelantoChange: (adelanto: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemoveItem: (productId: string) => void;
  onToggleBonificacion: (productId: string) => void;
  onToggleDegustacion: (productId: string) => void;
  onSubmit: () => void;
  isClientSelected: boolean;
  isSubmitting?: boolean;
  notaPedido: string;
  onNotaPedidoChange: (notaPedido: string) => void;
  isSplitPayment: boolean;
  onIsSplitPaymentChange: (isSplit: boolean) => void;
  splitPayments: SplitPaymentRow[];
  onSplitPaymentsChange: (payments: SplitPaymentRow[]) => void;
}

export const SaleCart = ({
  cart,
  paymentType,
  discount,
  metodoPago,
  adelanto,
  onPaymentTypeChange,
  onDiscountChange,
  onMetodoPagoChange,
  onAdelantoChange,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onToggleBonificacion,
  onToggleDegustacion,
  onSubmit,
  isClientSelected,
  isSubmitting,
  notaPedido,
  onNotaPedidoChange,
  isSplitPayment,
  onIsSplitPaymentChange,
  splitPayments,
  onSplitPaymentsChange,
}: SaleCartProps) => {
  const regularItems = cart.filter(item => !item.esBonificacion && !item.esDegustacion);
  const bonificaciones = cart.filter(item => item.esBonificacion);
  const degustaciones = cart.filter(item => item.esDegustacion);

  const subtotal = regularItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const montoACubrir = paymentType === 'CONTADO' ? total : adelanto;
  const sumaSplit = splitPayments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const diferenciaSplit = Math.abs(montoACubrir - sumaSplit);
  const isSplitValid = !isSplitPayment || (montoACubrir > 0 && diferenciaSplit < 0.01);

  const handleAddSplitRow = () => {
    const restante = Math.max(0, montoACubrir - sumaSplit);
    onSplitPaymentsChange([
      ...splitPayments,
      { metodo_pago: 'efectivo', monto: parseFloat(restante.toFixed(2)) }
    ]);
  };

  const handleUpdateSplitRow = (index: number, field: keyof SplitPaymentRow, value: any) => {
    const newPayments = [...splitPayments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    onSplitPaymentsChange(newPayments);
  };

  const handleRemoveSplitRow = (index: number) => {
    onSplitPaymentsChange(splitPayments.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-card rounded-xl border shadow-card p-5 sticky top-20 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Carrito</h3>
        <Badge variant="secondary" className="ml-auto">
          {totalItems} items
        </Badge>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">El carrito está vacío</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[250px] overflow-y-auto">
          {regularItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase">Productos</h4>
              {regularItems.map((item, index) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  index={index}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdatePrice={onUpdatePrice}
                  onRemove={onRemoveItem}
                  onToggleBonificacion={onToggleBonificacion}
                  onToggleDegustacion={onToggleDegustacion}
                />
              ))}
            </div>
          )}
          {bonificaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                <Gift className="h-3 w-3" /> Bonificaciones
              </h4>
              {bonificaciones.map((item, index) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  index={regularItems.length + index}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdatePrice={onUpdatePrice}
                  onRemove={onRemoveItem}
                  onToggleBonificacion={onToggleBonificacion}
                  onToggleDegustacion={onToggleDegustacion}
                  isFree
                />
              ))}
            </div>
          )}
          {degustaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                <Coffee className="h-3 w-3" /> Degustaciones
              </h4>
              {degustaciones.map((item, index) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  index={regularItems.length + bonificaciones.length + index}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdatePrice={onUpdatePrice}
                  onRemove={onRemoveItem}
                  onToggleBonificacion={onToggleBonificacion}
                  onToggleDegustacion={onToggleDegustacion}
                  isFree
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Separator className="my-4" />

      {/* Payment Type */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-2 block">Tipo de Pago</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={paymentType === 'CONTADO' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => onPaymentTypeChange('CONTADO')}
          >
            <Banknote className="h-4 w-4" />
            Contado
          </Button>
          <Button
            variant={paymentType === 'CREDITO' ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => onPaymentTypeChange('CREDITO')}
          >
            <CreditCard className="h-4 w-4" />
            Crédito
          </Button>
        </div>
      </div>

      {/* Adelanto (solo para crédito) */}
      {paymentType === 'CREDITO' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Label className="text-sm text-amber-700 dark:text-amber-400 mb-2 block">Adelanto (S/)</Label>
          <Input
            type="number"
            min="0"
            max={total}
            step="0.5"
            placeholder="0.00"
            value={adelanto || ''}
            onChange={(e) => onAdelantoChange(Number(e.target.value))}
          />
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            Saldo a crédito: S/ {(total - adelanto).toFixed(2)}
          </p>
        </div>
      )}

      {/* Selector Método Único vs Pago Dividido */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            <Wallet className="h-3 w-3 inline mr-1" />
            Método de Pago
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary font-medium hover:bg-primary/10"
            onClick={() => {
              const nextState = !isSplitPayment;
              onIsSplitPaymentChange(nextState);
              if (nextState && splitPayments.length === 0) {
                const target = paymentType === 'CONTADO' ? total : adelanto;
                onSplitPaymentsChange([
                  { metodo_pago: metodoPago || 'efectivo', monto: parseFloat(target.toFixed(2)) }
                ]);
              }
            }}
          >
            {isSplitPayment ? '← Usar pago único' : '🔀 Dividir pago'}
          </Button>
        </div>

        {!isSplitPayment ? (
          <Select value={metodoPago} onValueChange={onMetodoPagoChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="yape">Yape</SelectItem>
              <SelectItem value="plin">Plin</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="deposito">Depósito Bancario</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="p-3 rounded-lg border bg-muted/40 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span>Desglose de Pagos (Múltiples)</span>
              <span className={diferenciaSplit < 0.01 ? 'text-emerald-600' : 'text-amber-600'}>
                Total: S/ {sumaSplit.toFixed(2)} / S/ {montoACubrir.toFixed(2)}
              </span>
            </div>

            {splitPayments.map((row, idx) => (
              <div key={idx} className="space-y-1.5 p-2 bg-background rounded-md border text-xs">
                <div className="flex items-center gap-1.5">
                  <Select
                    value={row.metodo_pago}
                    onValueChange={(val) => handleUpdateSplitRow(idx, 'metodo_pago', val)}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="yape">Yape</SelectItem>
                      <SelectItem value="plin">Plin</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 w-24">
                    <span>S/</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={row.monto || ''}
                      onChange={(e) => handleUpdateSplitRow(idx, 'monto', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs px-1"
                    />
                  </div>

                  {splitPayments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveSplitRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {row.metodo_pago === 'deposito' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <Input
                      placeholder="Banco"
                      value={row.banco || ''}
                      onChange={(e) => handleUpdateSplitRow(idx, 'banco', e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="N° Operación"
                      value={row.numero_operacion || ''}
                      onChange={(e) => handleUpdateSplitRow(idx, 'numero_operacion', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1"
              onClick={handleAddSplitRow}
            >
              <Plus className="h-3 w-3" /> Agregar otro método
            </Button>

            {!isSplitValid && (
              <p className="text-xs text-red-500 font-medium text-center">
                La suma de los pagos (S/ {sumaSplit.toFixed(2)}) debe ser exactamente igual al monto a pagar (S/ {montoACubrir.toFixed(2)}).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Nota Pedido (solo para crédito) */}
      {paymentType === 'CREDITO' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-1.5">
          <Label className="text-sm text-amber-700 dark:text-amber-400 block font-medium">
            Nota Pedido <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            placeholder="Ingrese Nota de Pedido"
            value={notaPedido}
            onChange={(e) => onNotaPedidoChange(e.target.value)}
            className="bg-background border-input focus-visible:ring-amber-500"
          />
        </div>
      )}

      {/* Discount */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-2 block">Descuento (S/)</Label>
        <Input
          type="number"
          min="0"
          step="0.5"
          value={discount}
          onChange={(e) => onDiscountChange(Number(e.target.value))}
        />
      </div>

      {/* Totals */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>S/ {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
            <span>Descuento</span>
            <span>-S/ {discount.toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-display text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">S/ {total.toFixed(2)}</span>
        </div>
        {paymentType === 'CREDITO' && adelanto > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Adelanto</span>
            <span>S/ {adelanto.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Button
        variant="gradient"
        className="w-full"
        size="lg"
        onClick={onSubmit}
        disabled={
          (regularItems.length === 0 && !cart.some(item => item.esDegustacion)) ||
          !isClientSelected ||
          (paymentType === 'CREDITO' && !notaPedido.trim()) ||
          !isSplitValid
        }
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
      </Button>
    </div>
  );
};

interface CartItemRowProps {
  item: CartItem;
  index?: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onToggleBonificacion: (productId: string) => void;
  onToggleDegustacion: (productId: string) => void;
  isFree?: boolean;
}

const CartItemRow = ({ item, index = 0, onUpdateQuantity, onUpdatePrice, onRemove, onToggleBonificacion, onToggleDegustacion, isFree }: CartItemRowProps) => {
  const [inputValue, setInputValue] = useState(item.quantity.toString());
  const [inputPrice, setInputPrice] = useState(Number(item.price).toFixed(2));

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  useEffect(() => {
    setInputPrice(Number(item.price).toFixed(2));
  }, [item.price]);

  const themeIndex = Math.abs(index) % 3;

  const themes = [
    // 0: Amarillo suave
    {
      container: "p-3 rounded-lg bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2 shadow-sm transition-colors",
      title: "font-medium text-sm truncate text-amber-950 dark:text-amber-100",
      badge: "text-xs h-5 border-amber-300 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200",
      subtext: "text-xs text-amber-800/80 dark:text-amber-300/70",
      priceContainer: "flex items-center gap-1 text-xs text-amber-900/80 dark:text-amber-300/80 mt-1",
      priceInput: "w-16 h-6 px-1 text-xs py-0 focus-visible:ring-1 focus-visible:ring-amber-500 bg-background/80 border-amber-300 dark:border-amber-700",
      removeBtn: "h-7 w-7 text-destructive hover:text-destructive hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0",
      qtyBtn: "h-7 w-7 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50",
      qtyInput: "w-14 text-center h-7 px-1 focus-visible:ring-1 focus-visible:ring-amber-500 border-amber-300 dark:border-amber-700 bg-background/80 rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
      checkbox: "h-3.5 w-3.5 border-amber-400"
    },
    // 1: Celeste suave
    {
      container: "p-3 rounded-lg bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 space-y-2 shadow-sm transition-colors",
      title: "font-medium text-sm truncate text-sky-950 dark:text-sky-100",
      badge: "text-xs h-5 border-sky-300 dark:border-sky-700 bg-sky-100/50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200",
      subtext: "text-xs text-sky-800/80 dark:text-sky-300/70",
      priceContainer: "flex items-center gap-1 text-xs text-sky-900/80 dark:text-sky-300/80 mt-1",
      priceInput: "w-16 h-6 px-1 text-xs py-0 focus-visible:ring-1 focus-visible:ring-sky-500 bg-background/80 border-sky-300 dark:border-sky-700",
      removeBtn: "h-7 w-7 text-destructive hover:text-destructive hover:bg-sky-100 dark:hover:bg-sky-900/50 shrink-0",
      qtyBtn: "h-7 w-7 border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/50",
      qtyInput: "w-14 text-center h-7 px-1 focus-visible:ring-1 focus-visible:ring-sky-500 border-sky-300 dark:border-sky-700 bg-background/80 rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
      checkbox: "h-3.5 w-3.5 border-sky-400"
    },
    // 2: Verde suave
    {
      container: "p-3 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2 shadow-sm transition-colors",
      title: "font-medium text-sm truncate text-emerald-950 dark:text-emerald-100",
      badge: "text-xs h-5 border-emerald-300 dark:border-emerald-700 bg-emerald-100/50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200",
      subtext: "text-xs text-emerald-800/80 dark:text-emerald-300/70",
      priceContainer: "flex items-center gap-1 text-xs text-emerald-900/80 dark:text-emerald-300/80 mt-1",
      priceInput: "w-16 h-6 px-1 text-xs py-0 focus-visible:ring-1 focus-visible:ring-emerald-500 bg-background/80 border-emerald-300 dark:border-emerald-700",
      removeBtn: "h-7 w-7 text-destructive hover:text-destructive hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shrink-0",
      qtyBtn: "h-7 w-7 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
      qtyInput: "w-14 text-center h-7 px-1 focus-visible:ring-1 focus-visible:ring-emerald-500 border-emerald-300 dark:border-emerald-700 bg-background/80 rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
      checkbox: "h-3.5 w-3.5 border-emerald-400"
    }
  ];

  const t = themes[themeIndex];

  return (
    <div className={t.container}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={t.title}>{item.name}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {item.marca && (
              <Badge variant="outline" className={t.badge}>
                {item.marca}
              </Badge>
            )}
            {item.presentacion && (
              <span className={t.subtext}>
                {item.presentacion}
              </span>
            )}
          </div>
          {!isFree && (
            <div className={t.priceContainer}>
              <span>S/</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={inputPrice}
                onChange={(e) => {
                  setInputPrice(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    onUpdatePrice(item.productId, val);
                  }
                }}
                onBlur={() => {
                  const val = parseFloat(inputPrice);
                  if (isNaN(val) || val < 0) {
                    onUpdatePrice(item.productId, Number(item.price));
                    setInputPrice(Number(item.price).toFixed(2));
                  } else {
                    setInputPrice(val.toFixed(2));
                  }
                }}
                className={t.priceInput}
              />
              <span>x {item.quantity} = S/ {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          )}
          {isFree && (
            <p className={`${t.subtext} mt-1`}>
              Cantidad: {item.quantity}
            </p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className={t.removeBtn}
          onClick={() => onRemove(item.productId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className={t.qtyBtn}
            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => {
              const valStr = e.target.value;
              setInputValue(valStr);
              const val = parseInt(valStr, 10);
              if (!isNaN(val) && val > 0) {
                onUpdateQuantity(item.productId, val);
              }
            }}
            onBlur={() => {
              const val = parseInt(inputValue, 10);
              if (isNaN(val) || val <= 0) {
                onUpdateQuantity(item.productId, 1);
                setInputValue("1");
              } else {
                onUpdateQuantity(item.productId, val);
                setInputValue(val.toString());
              }
            }}
            className={t.qtyInput}
          />
          <Button
            size="icon"
            variant="outline"
            className={t.qtyBtn}
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {!isFree && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <Checkbox
                checked={false}
                onCheckedChange={() => onToggleBonificacion(item.productId)}
                className={t.checkbox}
              />
              <Gift className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <Checkbox
                checked={false}
                onCheckedChange={() => onToggleDegustacion(item.productId)}
                className={t.checkbox}
              />
              <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
