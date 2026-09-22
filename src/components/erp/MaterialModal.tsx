import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MaterialCategory } from '@/types/erp';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  categories: MaterialCategory[];
}

export function MaterialModal({ isOpen, onClose, onSubmit, categories }: MaterialModalProps) {
  const [formData, setFormData] = React.useState({
    sku: '',
    nome: '',
    categoria: 'matéria-prima' as MaterialCategory,
    unidade: '',
    estoqueMinimo: 5,
    quantidade: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      sku: '',
      nome: '',
      categoria: 'matéria-prima',
      unidade: '',
      estoqueMinimo: 5,
      quantidade: 0
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
          <DialogDescription>
            Cadastre um novo item para o controle de estoque.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="sku">SKU (Código Único)</Label>
            <Input 
              id="sku" 
              required 
              value={formData.sku} 
              onChange={(e) => setFormData({...formData, sku: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do Material</Label>
            <Input 
              id="nome" 
              required 
              value={formData.nome} 
              onChange={(e) => setFormData({...formData, nome: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select 
                value={formData.categoria} 
                onValueChange={(v: any) => setFormData({...formData, categoria: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.replace('-', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input 
                id="unidade" 
                placeholder="ex: KG, UN" 
                value={formData.unidade} 
                onChange={(e) => setFormData({...formData, unidade: e.target.value})} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
              <Input 
                id="estoqueMinimo" 
                type="number" 
                value={formData.estoqueMinimo} 
                onChange={(e) => setFormData({...formData, estoqueMinimo: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantidade">Qtd. Inicial</Label>
              <Input 
                id="quantidade" 
                type="number" 
                value={formData.quantidade} 
                onChange={(e) => setFormData({...formData, quantidade: parseFloat(e.target.value)})} 
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar Material</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
