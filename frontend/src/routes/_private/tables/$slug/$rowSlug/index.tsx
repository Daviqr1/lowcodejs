import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { RouteNotFound, RoutePending } from '@/components/common/route-status';
import { rowBySlugOptions } from '@/hooks/tanstack-query/_query-options';

// Segmentos estaticos irmaos sob $slug (row, detail, field, methods) tem
// precedencia sobre este segmento dinamico, mas guardamos por seguranca para
// nunca tratar uma rota reservada como slug de registro.
const RESERVED_SEGMENTS = new Set(['row', 'detail', 'field', 'methods']);

export const Route = createFileRoute('/_private/tables/$slug/$rowSlug/')({
  beforeLoad: ({ params }) => {
    if (RESERVED_SEGMENTS.has(params.rowSlug)) throw notFound();
  },
  component: RowSlugResolver,
});

// Resolve o slug amigavel -> registro no CLIENT e redireciona para a pagina de
// detalhe por _id. NAO resolve no SSR de proposito: o cookie de auth vive no
// dominio do backend e nao chega ao SSR do front, entao o `by-slug` so autentica
// no navegador (axios withCredentials manda o cookie direto pro api.*).
function RowSlugResolver(): React.JSX.Element {
  const { slug, rowSlug } = Route.useParams();
  const navigate = useNavigate();

  const { data, isError } = useQuery(rowBySlugOptions(slug, rowSlug));

  useEffect(() => {
    if (!data) return;
    navigate({
      to: '/tables/$slug/row',
      params: { slug },
      search: { _id: data._id, mode: 'view' },
      replace: true,
    });
  }, [data, navigate, slug]);

  if (isError) return <RouteNotFound />;

  return <RoutePending />;
}
