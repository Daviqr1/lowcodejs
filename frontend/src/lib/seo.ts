type MetaTag = Record<string, string>;
type HeadResult = { meta: Array<MetaTag> };

export function createRouteHead(options: {
  title: string;
  description?: string;
}): (ctx: { matches: Array<{ loaderData?: unknown }> }) => HeadResult {
  return ({ matches }): HeadResult => {
    // loaderData do root é unknown em runtime (SSR); assumimos o contrato conhecido.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const root = matches[0]?.loaderData as
      | {
          systemName?: string;
          appUrl?: string;
          baseUrl?: string;
          systemDescription?: string;
        }
      | undefined;
    const systemName = root?.systemName || 'LowCodeJs';
    const fullTitle = `${options.title} - ${systemName}`;
    const desc = options.description;

    const meta: Array<MetaTag> = [{ title: fullTitle }];

    if (desc) {
      meta.push(
        { name: 'description', content: desc },
        { property: 'og:title', content: fullTitle },
        { property: 'og:description', content: desc },
        { name: 'twitter:title', content: fullTitle },
        { name: 'twitter:description', content: desc },
      );
    } else {
      meta.push(
        { property: 'og:title', content: fullTitle },
        { name: 'twitter:title', content: fullTitle },
      );
    }

    return { meta };
  };
}
