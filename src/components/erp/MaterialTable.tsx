import React from 'react';
import { Material } from '@/types/erp';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MaterialTableProps {
  materials: Material[];
  searchTerm: string;
}

export function MaterialTable({ materials, searchTerm }: MaterialTableProps) {
  const filteredMaterials = materials.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMaterials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhum material encontrado.
              </TableCell>
            </TableRow>
          ) : (
            filteredMaterials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium">{material.sku}</TableCell>
                <TableCell>{material.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {material.categoria.replace('-', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {material.quantidade}
                </TableCell>
                <TableCell>{material.unidade}</TableCell>
                <TableCell className="text-right">
                  {material.quantidade <= material.estoqueMinimo ? (
                    <Badge variant="destructive">REPOR</Badge>
                  ) : (
                    <Badge variant="secondary">OK</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
