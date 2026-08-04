import { Service } from 'fastify-decorators';

import { DateContractService } from '@application/services/date/date-contract.service';
import { SearchContractService } from '@application/services/search/search-contract.service';

import {
  FieldFilterContractService,
  type DateRangeFilter,
  type RefInFilter,
  type TextFilter,
} from './field-filter-contract.service';

@Service()
export default class FieldFilterService implements FieldFilterContractService {
  constructor(
    private readonly search: SearchContractService,
    private readonly date: DateContractService,
  ) {}

  text(value: unknown): TextFilter {
    return {
      $regex: this.search.normalize(String(value)),
      $options: 'i',
    };
  }

  refIn(value: unknown): RefInFilter {
    return { $in: String(value).split(',') };
  }

  dateRange(initial: unknown, final: unknown): DateRangeFilter | null {
    const range: DateRangeFilter = {};

    if (initial) range.$gte = this.date.startOfDay(String(initial));
    if (final) range.$lte = this.date.endOfDay(String(final));

    if (!range.$gte && !range.$lte) return null;
    return range;
  }
}
