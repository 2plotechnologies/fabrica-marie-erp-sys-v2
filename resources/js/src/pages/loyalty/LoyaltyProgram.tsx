import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Gift,
  Star,
  Award,
  TrendingUp,
  Users,
  Sparkles,
  Crown,
  Zap,
  Trophy,
} from 'lucide-react';
import { mockClients } from '@/data/mockData';

// Mock loyalty data
const mockLoyaltyClients = mockClients.map((client, index) => ({
  ...client,
  points: Math.floor(Math.random() * 5000) + 500,
  tier: index % 3 === 0 ? 'ORO' : index % 3 === 1 ? 'PLATA' : 'BRONCE',
  totalPurchases: Math.floor(Math.random() * 50000) + 10000,
  lastRedemption: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
}));

const mockRewards = [
  { id: '1', name: 'Caja de Galletas Premium', points: 500, stock: 25, category: 'Producto' },
  { id: '2', name: '10% Descuento en próxima compra', points: 300, stock: 100, category: 'Descuento' },
  { id: '3', name: 'Galletas Edición Especial', points: 800, stock: 15, category: 'Producto' },
  { id: '4', name: '20% Descuento en próxima compra', points: 600, stock: 50, category: 'Descuento' },
  { id: '5', name: 'Caja Sorpresa Navideña', points: 1200, stock: 10, category: 'Especial' },
];

const LoyaltyProgram = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredClients = mockLoyaltyClients.filter((client) => {
    const matchesSearch = client.razon_social
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === 'all' || client.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'ORO':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'PLATA':
        return <Award className="h-4 w-4 text-gray-400" />;
      case 'BRONCE':
        return <Zap className="h-4 w-4 text-orange-600" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      ORO: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white',
      PLATA: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
      BRONCE: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
    };
    return (
      <Badge className={`${styles[tier]} flex items-center gap-1`}>
        {getTierIcon(tier)}
        {tier}
      </Badge>
    );
  };

  const getTierProgress = (tier: string) => {
    switch (tier) {
      case 'ORO':
        return 100;
      case 'PLATA':
        return 66;
      case 'BRONCE':
        return 33;
      default:
        return 0;
    }
  };

  const totalPoints = mockLoyaltyClients.reduce((acc, c) => acc + c.points, 0);
  const stats = {
    totalMembers: mockLoyaltyClients.length,
    goldMembers: mockLoyaltyClients.filter(c => c.tier === 'ORO').length,
    totalPoints,
    averagePoints: Math.round(totalPoints / mockLoyaltyClients.length),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Programa de Fidelización
          </h1>
          <p className="text-muted-foreground">
            Gestiona puntos, recompensas y niveles de clientes
          </p>
        </div>
        <Button className="bg-gradient-warm hover:opacity-90">
          <Sparkles className="h-4 w-4 mr-2" />
          Configurar Programa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Miembros</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes Oro</p>
                <p className="text-2xl font-bold text-amber-500">{stats.goldMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Star className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Puntos Totales</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalPoints.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.averagePoints.toLocaleString()} pts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Recompensas Disponibles
          </CardTitle>
          <CardDescription>
            Premios canjeables por puntos de fidelidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mockRewards.map((reward) => (
              <div
                key={reward.id}
                className="p-4 rounded-xl border bg-card hover:shadow-card-hover transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-warm mb-3">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <h4 className="font-medium text-sm mb-1">{reward.name}</h4>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {reward.category}
                  </Badge>
                  <p className="text-sm font-bold text-primary">{reward.points} pts</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Stock: {reward.stock} unidades
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={tierFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTierFilter('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={tierFilter === 'ORO' ? 'default' : 'outline'}
                onClick={() => setTierFilter('ORO')}
                size="sm"
                className={tierFilter === 'ORO' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                <Crown className="h-3 w-3 mr-1" />
                Oro
              </Button>
              <Button
                variant={tierFilter === 'PLATA' ? 'default' : 'outline'}
                onClick={() => setTierFilter('PLATA')}
                size="sm"
              >
                <Award className="h-3 w-3 mr-1" />
                Plata
              </Button>
              <Button
                variant={tierFilter === 'BRONCE' ? 'default' : 'outline'}
                onClick={() => setTierFilter('BRONCE')}
                size="sm"
                className={tierFilter === 'BRONCE' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <Zap className="h-3 w-3 mr-1" />
                Bronce
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Miembros del Programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead className="text-right">Compras Totales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.razon_social}</p>
                      <p className="text-xs text-muted-foreground">{client.razon_social}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getTierBadge(client.tier)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="font-bold">{client.points.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <Progress value={getTierProgress(client.tier)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.tier === 'ORO'
                          ? 'Nivel máximo'
                          : `${client.tier === 'PLATA' ? '1000' : '500'} pts para subir`
                        }
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    S/ {client.totalPurchases.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyaltyProgram;
