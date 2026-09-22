import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Material, MaterialCategory, UnitOfMeasure } from '@/types';
import { Plus, Search, Package, AlertCircle } from 'lucide-react';

interface InventoryProps {
  materials: Material[];
  onAddMaterial: (material: Omit<Material, 'id' | 'quantity'>) => void;
}

export function Inventory({ materials, onAddMaterial }: InventoryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [newMaterial, setNewMaterial] = useState({
    sku: '',
    name: '',
    category: 'Raw Material' as MaterialCategory,
    minStock: 5,
    unit: 'un' as UnitOfMeasure
  });

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newMaterial.sku || !newMaterial.name) return;
    onAddMaterial(newMaterial);
    setIsDialogOpen(false);
    setNewMaterial({
      sku: '',
      name: '',
      category: 'Raw Material',
      minStock: 5,
      unit: 'un'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground text-sm">Monitor and manage your industrial materials.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or name..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min. Stock</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No materials found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMaterials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={m.quantity <= m.minStock ? "text-destructive font-bold" : ""}>
                        {m.quantity} {m.unit}
                      </span>
                      {m.quantity <= m.minStock && <AlertCircle className="h-4 w-4 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell>{m.minStock} {m.unit}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>
              Register a new material in the system inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input 
                id="sku" 
                placeholder="e.g. MAT-001" 
                value={newMaterial.sku}
                onChange={(e) => setNewMaterial({...newMaterial, sku: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Industrial Steel Plate" 
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newMaterial.category} 
                  onValueChange={(v: any) => setNewMaterial({...newMaterial, category: v})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Raw Material">Raw Material</SelectItem>
                    <SelectItem value="Component">Component</SelectItem>
                    <SelectItem value="Finished Good">Finished Good</SelectItem>
                    <SelectItem value="Consumable">Consumable</SelectItem>
                    <SelectItem value="Tooling">Tooling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select 
                  value={newMaterial.unit} 
                  onValueChange={(v: any) => setNewMaterial({...newMaterial, unit: v})}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="set">set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minStock">Minimum Stock Level</Label>
              <Input 
                id="minStock" 
                type="number" 
                value={newMaterial.minStock}
                onChange={(e) => setNewMaterial({...newMaterial, minStock: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
