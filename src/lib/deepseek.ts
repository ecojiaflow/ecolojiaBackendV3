// PATH: src/lib/deepseek.ts
type DeepseekInput = {
  title: string;
  id: string;
};

export const calculate = async ({ title, id }: DeepseekInput): Promise<number> => {
  // Simulation d'un calcul (remplacer par logique réelle si dispo)
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const score = (hash + id.length * 10) % 100;
  return score;
};
// EOF
