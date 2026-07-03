import type { IField } from './interfaces';

import { isFieldShownInContext } from '@/lib/permission';

export function HeaderFilter(field: IField): boolean {
  return isFieldShownInContext(field, 'list') && !field.trashed;
}

export function HeaderSorter(order: Array<string>) {
  return function (a: IField, b: IField): number {
    const idxA = order.indexOf(a._id);
    const idxB = order.indexOf(b._id);
    let rankA = idxA;
    if (idxA === -1) rankA = Infinity;
    let rankB = idxB;
    if (idxB === -1) rankB = Infinity;
    return rankA - rankB;
  };
}
