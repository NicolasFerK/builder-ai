import React from 'react';
import { Material } from '@/types/erp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface ERPStatsProps {
  materials: Material[];
}

export function ERPStats({ materials }: ERPStatsProps) {
  const lowStock = materials.filter(m => m.quantidade <= m.estoqueMinimo).length;
  const totalItems = materials.length;
  const totalValue = materials.reduce((acc, m) => acc + m.quantidade, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground">Materiais cadastrados</p>
        </CardContent>
      </Card>
      <Card className={lowStock > 0 ? "border-destructive bg-destructive/5" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alerta de Estoque</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${lowStock > 0 ? "text-destructive" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${lowStock > 0 ? "text-destructive" : ""}`}>
            {lowStock}
          </div>
          <p className="text-xs text-muted-foreground">Itens abaixo do mínimo</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalValue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Unidades em estoque</p>
        </CardContent>
      </Card>
    </div>
  );
}
