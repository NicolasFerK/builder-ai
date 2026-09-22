import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Material, Movement } from '@/types';

interface DashboardProps {
  materials: Material[];
  movements: Movement[];
}

export function Dashboard({ materials, movements }: DashboardProps) {
  const totalItems = materials.length;
  const lowStockItems = materials.filter(m => m.quantity <= m.minStock).length;
  const recentMovements = [...movements].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const totalIn = movements
    .filter(m => m.type === 'IN')
    .reduce((acc, m) => acc + m.quantity, 0);
  
  const totalOut = movements
    .filter(m => m.type === 'OUT')
    .reduce((acc, m) => acc + m.quantity, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inbound</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIn.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outbound</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent movements recorded.</p>
              ) : (
                recentMovements.map((m) => {
                  const material = materials.find(mat => mat.id === m.materialId);
                  return (
                    <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {material?.name || 'Unknown Material'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${m.type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                          {m.type === 'IN' ? '+' : '-'}{m.quantity} {material?.unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Critical Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {materials.filter(m => m.quantity <= m.minStock).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All stock levels are healthy.</p>
              ) : (
                materials.filter(m => m.quantity <= m.minStock).map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {m.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{m.quantity} {m.unit}</p>
                      <p className="text-[10px] text-muted-foreground">Min: {m.minStock}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
