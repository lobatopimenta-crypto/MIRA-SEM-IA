
/**
 * O serviço de IA foi desativado conforme solicitação.
 * As funções abaixo agora retornam apenas metadados fixos para manter a compatibilidade da UI.
 */

export const analyzeDroneImage = async (base64Image: string, fileName: string): Promise<string> => {
  // Análise via IA removida. 
  return "Módulo de análise por IA desabilitado. Proceder com inspeção manual para este ativo.";
};

export const analyzeDroneVideoContext = async (fileName: string, metadata: string): Promise<string> => {
  // Análise via IA removida.
  return "Análise tática automatizada indisponível no momento.";
};
