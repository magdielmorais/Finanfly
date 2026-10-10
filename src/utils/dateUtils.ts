import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

// Exemplo de referência conforme regra ISO-8601:
// dayjs('2026-09-01').isoWeek(); // Retorna 36

/**
 * Calcula a quantidade de semanas de um determinado mês no ano, aplicando a regra:
 * - Sempre que na primeira semana do mês tiver 3 dias ou menos, essa semana faz parte do mês anterior;
 *   se igual ou maior que 4 dias, faz parte da contagem do mês atual.
 * - A última semana do mês tiver 3 dias ou menos, ela fará parte da semana do mês seguinte;
 *   se igual a 4 dias ou mais, fará parte na contagem do mês atual.
 *
 * @param year Ano de exercício (ex: 2026)
 * @param monthIndex Índice do mês de 0 a 11 (0 = Janeiro, 8 = Setembro, 11 = Dezembro)
 * @returns Quantidade de semanas do mês (4 ou 5)
 */
export function getMonthWeeksCount(year: number, monthIndex: number): number {
  const startOfMonth = dayjs(new Date(year, monthIndex, 1));
  const endOfMonth = dayjs(new Date(year, monthIndex + 1, 0));

  // Mapeia os dias pertencentes a este mês agrupados pela semana ISO (identificada pela segunda-feira)
  const weekDaysMap = new Map<string, number>();

  let curr = startOfMonth;
  while (curr.isBefore(endOfMonth) || curr.isSame(endOfMonth, 'day')) {
    const weekKey = curr.startOf('isoWeek').format('YYYY-MM-DD');
    weekDaysMap.set(weekKey, (weekDaysMap.get(weekKey) || 0) + 1);
    curr = curr.add(1, 'day');
  }

  // Uma semana pertence à contagem do mês se possuir 4 ou mais dias no mês
  let count = 0;
  for (const days of weekDaysMap.values()) {
    if (days >= 4) {
      count++;
    }
  }

  return count;
}

/**
 * Retorna um array com a quantidade de semanas para todos os 12 meses do ano.
 */
export function getYearMonthsWeeks(year: number): number[] {
  return Array.from({ length: 12 }, (_, mIdx) => getMonthWeeksCount(year, mIdx));
}

export { dayjs, isoWeek };
