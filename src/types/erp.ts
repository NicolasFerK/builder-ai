export type MaterialCategory = 'matéria-prima' | 'ferramenta' | 'equipamento' | 'consumível' | 'outro';

export type Material = {
  id: string;
  sku: string;
  nome: string;
  categoria: MaterialCategory;
  quantidade: number;
  estoqueMinimo: number;
  unidade: string;
};

export type MovementType = 'ENTRADA' | 'SAIDA';

export type Movement = {
  id: string;
  materialId: string;
  tipo: MovementType;
  quantidade: number;
  data: string;
  observacao?: string;
};
