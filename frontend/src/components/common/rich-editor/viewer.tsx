import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

type EditorViewerProps = {
  content: string;
  className?: string;
};

export function ContentViewer({
  content,
  className,
}: EditorViewerProps): React.JSX.Element {
  if (!content) {
    return (
      <div
        data-slot="editor-viewer"
        data-test-id="rich-editor-viewer"
        className={cn('prose prose-sm max-w-none', className)}
      >
        <p className="text-muted-foreground">Sem conteudo</p>
      </div>
    );
  }

  // Remove estilos de cor branca/muito clara que ficam invisiveis em fundo claro
  const sanitizedContent = content.replace(
    /style="[^"]*color:\s*(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))[^"]*"/gi,
    '',
  );

  return (
    <div
      data-slot="editor-viewer"
      data-test-id="rich-editor-viewer"
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
      >
        {sanitizedContent}
      </Markdown>
    </div>
  );
}
