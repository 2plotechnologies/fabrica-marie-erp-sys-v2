/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Search, Package, Plus, Filter, Gift, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    stock?: number;
    created_at: string;
    updated_at: string;
  }

interface ProductSearchProps {
  onAddProduct: (product: Producto) => void;
  onAddBonificacion?: (product: Producto) => void;
  onAddDegustacion?: (product: Producto) => void;
  lista_productos: any[];
}

export const ProductSearch = ({
  onAddProduct,
  onAddBonificacion,
  onAddDegustacion,
  lista_productos,
}: ProductSearchProps) => {
  const [searchProduct, setSearchProduct] = useState('');
  const [filterMarca, setFilterMarca] = useState<string>('all');
  const [filterPresentacion, setFilterPresentacion] = useState<string>('all');
  const productos= lista_productos;

  const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))];
  const presentaciones = [...new Set(productos.map(p => p.presentacion).filter(Boolean))];

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.marca?.toLowerCase().includes(searchProduct.toLowerCase()));
    const matchesMarca = filterMarca === 'all' || p.marca === filterMarca;
    const matchesPresentacion = filterPresentacion === 'all' || p.presentacion === filterPresentacion;
    return matchesSearch && matchesMarca && matchesPresentacion;
  });

  return (
    <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Productos</h3>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU o marca..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger className="h-9">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {marcas.map((marca: string) => (
                    <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={filterPresentacion} onValueChange={setFilterPresentacion}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Presentación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {presentaciones.map((pres: string) => (
                    <SelectItem key={pres} value={pres}>{pres}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-secondary/50 transition-colors animate-fade-in cursor-pointer"
            style={{ animationDelay: `${300 + index * 50}ms` }}
            onClick={() => onAddProduct(product)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{product.nombre}</p>
                {product.marca && (
                  <Badge variant="outline" className="text-xs">{product.marca}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                {product.presentacion && (
                  <span className="text-xs text-muted-foreground">• {product.presentacion}</span>
                )}
                {product.peso && (
                  <span className="text-xs text-muted-foreground">• {product.peso} Kg</span>
                )}
                {product.stock !== undefined && (
                  <span className={`text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    • Stock: {product.stock}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex items-center gap-1 sm:gap-2">
              <p className="font-semibold text-primary mr-1 sm:mr-2 text-sm sm:text-base">
                S/ {Number(product.precio_base).toFixed(2)}
              </p>
              <div className="flex items-center gap-1">
                {onAddBonificacion && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700"
                    title="Agregar como Bonificación"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBonificacion(product);
                    }}
                  >
                    <Gift className="h-4 w-4" />
                  </Button>
                )}
                {onAddDegustacion && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-amber-600 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700"
                    title="Agregar como Degustación"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddDegustacion(product);
                    }}
                  >
                    <Coffee className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  title="Agregar Producto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddProduct(product);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron productos
          </div>
        )}
      </div>
    </div>
  );
};
