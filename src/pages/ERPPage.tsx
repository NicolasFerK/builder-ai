import React, { useState, useEffect } from 'react';
import { Plus, History, Search, LayoutDashboard } from 'lucide-react';
import { Material, Movement, MaterialCategory } from '@/types/erp';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ERPStats } from '@/components/erp/ERPStats';
import { MaterialTable } from '@/components/erp/MaterialTable';
import { MaterialModal } from '@/components/erp/MaterialModal';
import { MovementModal } from '@/components/erp/MovementModal';

const CATEGORIES: MaterialCategory[] = ['matéria-prima', 'ferramenta', 'equipamento', 'consumível', 'outro'];

export default function ERPPage() {
  // State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);

  // Load Data
  useEffect(() => {
    const savedMaterials = localStorage.getItem('erp_materials');
    const savedMovements = localStorage.getItem('erp_movements');
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    if (savedMovements) setMovements(JSON.parse(savedMovements));
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('erp_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('erp_movements', JSON.stringify(movements));
  }, [movements]);

  // Handlers
  const handleAddMaterial = (data: any) => {
    const material: Material = {
      id: crypto.randomUUID(),
      sku: data.sku,
      nome: data.nome,
      categoria: data.categoria,
      quantidade: data.quantidade,
      estoqueMinimo: data.estoqueMinimo,
      unidade: data.unidade
    };
    setMaterials([...materials, material]);
  };

  const handleRegisterMovement = (data: any) => {
    const qty = data.quantidade;
    const material = materials.find(m => m.id === data.materialId);
    if (!material) return;

    if (data.tipo === 'SAIDA' && material.quantidade < qty) {
      alert('Estoque insuficiente!');
      return;
    }

    const movement: Movement = {
      id: crypto.randomUUID(),
      materialId: data.materialId,
      tipo: data.tipo,
      quantidade: qty,
      data: new Date().toISOString(),
      observacao: data.observacao
    };

    setMaterials(materials.map(m => {
      if (m.id === data.materialId) {
        return {
          ...m,
          quantidade: data.tipo === 'ENTRADA' ? m.quantidade + qty : m.quantidade - qty
        };
      }
      return m;
    }));

    setMovements([movement, ...movements]);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard ERP</h1>
            <p className="text-slate-500">Controle de Materiais Industriais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsMovementOpen(true)}>
            <History className="mr-2 h-4 w-4" /> Movimentar
          </Button>
          <Button onClick={() => setIsNewMaterialOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Material
          </Button>
        </div>
      </div>

      <ERPStats materials={materials} />

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Estoque Atual</CardTitle>
              <CardDescription>Gerencie as quantidades e SKUs dos seus materiais.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MaterialTable materials={materials} searchTerm={searchTerm} />
        </CardContent>
      </Card>

      <MaterialModal 
        isOpen={isNewMaterialOpen} 
        onClose={() => setIsNewMaterialOpen(false)} 
        onSubmit={handleAddMaterial}
        categories={CATEGORIES}
      />

      <MovementModal 
        isOpen={isMovementOpen} 
        onClose={() => setIsMovementOpen(false)} 
        onSubmit={handleRegisterMovement}
        materials={materials}
      />
    </div>
  );
}
