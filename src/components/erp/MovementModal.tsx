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
import { Material } from '@/types/erp';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  materials: Material[];
}

export function MovementModal({ isOpen, onClose, onSubmit, materials }: MovementModalProps) {
  const [formData, setFormData] = React.useState({
    materialId: '',
    tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    quantidade: '',
    observacao: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialId || !formData.quantidade) return;
    
    onSubmit({
      ...formData,
      quantidade: parseFloat(formData.quantidade)
    });
    
    setFormData({
      materialId: '',
      tipo: 'ENTRADA',
      quantidade: '',
      observacao: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Selecione o material e o tipo de operação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="material">Material</Label>
            <Select 
              value={formData.materialId} 
              onValueChange={(v) => setFormData({...formData, materialId: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.nome} ({m.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Operação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                type="button" 
                variant={formData.tipo === 'ENTRADA' ? 'default' : 'outline'}
                onClick={() => setFormData({...formData, tipo: 'ENTRADA'})}
                className={formData.tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <ArrowUpCircle className="mr-2 h-4 w-4" /> Entrada
              </Button>
              <Button 
                type="button" 
                variant={formData.tipo === 'SAIDA' ? 'default' : 'outline'}
                onClick={() => setFormData({...formData, tipo: 'SAIDA'})}
                className={formData.tipo === 'SAIDA' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <ArrowDownCircle className="mr-2 h-4 w-4" /> Saída
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input 
              id="quantidade" 
              type="number" 
              step="0.01"
              required
              value={formData.quantidade} 
              onChange={(e) => setFormData({...formData, quantidade: e.target.value})} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacao">Observação (Opcional)</Label>
            <Input 
              id="observacao" 
              value={formData.observacao} 
              onChange={(e) => setFormData({...formData, observacao: e.target.value})} 
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
