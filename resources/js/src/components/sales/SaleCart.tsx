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
}: SaleCartProps) => {
  const regularItems = cart.filter(item => !item.esBonificacion && !item.esDegustacion);
  const bonificaciones = cart.filter(item => item.esBonificacion);
  const degustaciones = cart.filter(item => item.esDegustacion);

  const subtotal = regularItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
              {regularItems.map((item) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
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
              {bonificaciones.map((item) => (
                <CartItemRow key={item.productId} item={item} onUpdateQuantity={onUpdateQuantity} onUpdatePrice={onUpdatePrice} onRemove={onRemoveItem} onToggleBonificacion={onToggleBonificacion} onToggleDegustacion={onToggleDegustacion} isFree />
              ))}
            </div>
          )}
          {degustaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                <Coffee className="h-3 w-3" /> Degustaciones
              </h4>
              {degustaciones.map((item) => (
                <CartItemRow key={item.productId} item={item} onUpdateQuantity={onUpdateQuantity} onUpdatePrice={onUpdatePrice} onRemove={onRemoveItem} onToggleBonificacion={onToggleBonificacion} onToggleDegustacion={onToggleDegustacion} isFree />
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

      {/* Método de Pago */}
      <div className="mb-4">
        <Label className="text-sm text-muted-foreground mb-2 block">
          <Wallet className="h-3 w-3 inline mr-1" />
          Método de Pago
        </Label>
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
        disabled={regularItems.length === 0 || !isClientSelected}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
      </Button>
    </div>
  );
};

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onToggleBonificacion: (productId: string) => void;
  onToggleDegustacion: (productId: string) => void;
  isFree?: boolean;
}

const CartItemRow = ({ item, onUpdateQuantity, onUpdatePrice, onRemove, onToggleBonificacion, onToggleDegustacion, isFree }: CartItemRowProps) => {
  const [inputValue, setInputValue] = useState(item.quantity.toString());
  const [inputPrice, setInputPrice] = useState(Number(item.price).toFixed(2));

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  useEffect(() => {
    setInputPrice(Number(item.price).toFixed(2));
  }, [item.price]);

  return (
    <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {item.marca && <Badge variant="outline" className="text-xs h-5">{item.marca}</Badge>}
            {item.presentacion && <span className="text-xs text-muted-foreground">{item.presentacion}</span>}
          </div>
          {!isFree && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
                className="w-16 h-6 px-1 text-xs py-0 focus-visible:ring-1 bg-background border-input"
              />
              <span>x {item.quantity} = S/ {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          )}
          {isFree && <p className="text-xs text-muted-foreground mt-1">Cantidad: {item.quantity}</p>}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => onRemove(item.productId)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="outline" 
            className="h-7 w-7" 
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
            className="w-14 text-center h-7 px-1 focus-visible:ring-1 border-input bg-background rounded-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button 
            size="icon" 
            variant="outline" 
            className="h-7 w-7" 
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {!isFree && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <Checkbox checked={false} onCheckedChange={() => onToggleBonificacion(item.productId)} className="h-3.5 w-3.5" />
              <Gift className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <Checkbox checked={false} onCheckedChange={() => onToggleDegustacion(item.productId)} className="h-3.5 w-3.5" />
              <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
