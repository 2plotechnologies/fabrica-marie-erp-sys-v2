/**
 * Formats a client's address concatenated with department, province, and district.
 * Example output: "Av. Los Pinos 123, PUNO, SAN ROMAN, JULIACA"
 */
export const formatDireccionCompleta = (c: any): string => {
  if (!c) return '';
  
  const parts: string[] = [];

  if (c.direccion && typeof c.direccion === 'string' && c.direccion.trim() !== '') {
    parts.push(c.direccion.trim());
  }

  const dep = typeof c.departamento === 'object' ? c.departamento?.departamento : (c.departamento_nombre || c.departamento);
  if (dep && typeof dep === 'string' && dep.trim() !== '') {
    parts.push(dep.trim());
  }

  const prov = typeof c.provincia === 'object' ? c.provincia?.provincia : (c.provincia_nombre || c.provincia);
  if (prov && typeof prov === 'string' && prov.trim() !== '') {
    parts.push(prov.trim());
  }

  const dist = typeof c.distrito === 'object' ? c.distrito?.distrito : (c.distrito_nombre || c.distrito);
  if (dist && typeof dist === 'string' && dist.trim() !== '') {
    parts.push(dist.trim());
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (c.direccion_completa && typeof c.direccion_completa === 'string') {
    return c.direccion_completa;
  }

  return '';
};
