export type HookType = 'onLoad' | 'beforeSave' | 'afterSave';

type TutorialSection = {
  title: string;
  description: string;
  examples: Array<{
    title: string;
    code: string;
    description: string;
  }>;
};

type TutorialContent = {
  title: string;
  subtitle: string;
  sections: Array<TutorialSection>;
};

/**
 * Returns tutorial content specific to each hook type
 */
export function getTutorialContent(hook: HookType): TutorialContent {
  const tutorials: Record<HookType, TutorialContent> = {
    onLoad: {
      title: 'onLoad - Carregamento de Formulario',
      subtitle:
        'Executado quando um registro e carregado no formulario de edicao',
      sections: [
        {
          title: 'Quando e executado?',
          description:
            'O codigo onLoad e executado sempre que um registro existente e carregado para visualizacao ou edicao. Ideal para calcular valores derivados ou formatar dados para exibicao.',
          examples: [
            {
              title: 'Calcular idade a partir da data de nascimento',
              code: `(async () => {
  const nascimento = field.get('data-nascimento');
  if (nascimento) {
    const hoje = utils.today();
    const nasc = new Date(nascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    field.set('idade', idade);
  }
})();`,
              description:
                'Calcula e preenche automaticamente o campo idade com base na data de nascimento',
            },
            {
              title: 'Formatar nome completo',
              code: `(async () => {
  const nome = field.get('nome') || '';
  const sobrenome = field.get('sobrenome') || '';
  field.set('nome-completo', \`\${nome} \${sobrenome}\`.trim());
})();`,
              description: 'Combina nome e sobrenome em um campo nome-completo',
            },
          ],
        },
      ],
    },

    beforeSave: {
      title: 'beforeSave - Antes de Salvar',
      subtitle:
        'Executado antes de salvar o registro no banco de dados. Pode bloquear o salvamento.',
      sections: [
        {
          title: 'Quando e executado?',
          description:
            'O codigo beforeSave e executado imediatamente antes de salvar. Se ocorrer um erro, o salvamento e cancelado. Ideal para validacoes e calculos.',
          examples: [
            {
              title: 'Validar e-mail obrigatorio',
              code: `(async () => {
  const email = field.get('email');
  if (!email || !email.includes('@')) {
    throw new Error('E-mail invalido ou nao preenchido');
  }
})();`,
              description: 'Bloqueia o salvamento se o e-mail nao for valido',
            },
            {
              title: 'Calcular total de pedido',
              code: `(async () => {
  const quantidade = Number(field.get('quantidade')) || 0;
  const precoUnitario = Number(field.get('preco-unitario')) || 0;
  const desconto = Number(field.get('desconto')) || 0;

  const subtotal = quantidade * precoUnitario;
  const total = subtotal - (subtotal * desconto / 100);

  field.set('total', total.toFixed(2));
})();`,
              description: 'Calcula o total do pedido antes de salvar',
            },
            {
              title: 'Gerar codigo unico',
              code: `(async () => {
  if (context.isNew) {
    const codigo = 'PED-' + utils.uuid().substring(0, 8).toUpperCase();
    field.set('codigo', codigo);
  }
})();`,
              description: 'Gera um codigo unico apenas para novos registros',
            },
            {
              title: 'Definir data de atualizacao',
              code: `(async () => {
  field.set('data-atualizacao', utils.now());

  if (context.isNew) {
    field.set('data-criacao', utils.now());
  }
})();`,
              description:
                'Registra automaticamente as datas de criacao e atualizacao',
            },
          ],
        },
      ],
    },

    afterSave: {
      title: 'afterSave - Apos Salvar',
      subtitle:
        'Executado apos o registro ser salvo com sucesso. Nao bloqueia o salvamento.',
      sections: [
        {
          title: 'Quando e executado?',
          description:
            'O codigo afterSave e executado depois que o registro ja foi salvo no banco. Erros aqui nao afetam o registro salvo. Ideal para notificacoes e integracoes.',
          examples: [
            {
              title: 'Enviar e-mail de confirmacao',
              code: `(async () => {
  const emailCliente = field.get('email');
  const nome = field.get('nome');
  const codigo = field.get('codigo');

  if (context.isNew && emailCliente) {
    await email.sendTemplate(
      [emailCliente],
      'Pedido Recebido',
      \`Ola \${nome}, seu pedido \${codigo} foi recebido com sucesso!\`
    );
  }
})();`,
              description:
                'Envia confirmacao por e-mail quando um novo pedido e criado',
            },
            {
              title: 'Notificar administrador',
              code: `(async () => {
  const valor = Number(field.get('valor')) || 0;

  if (valor > 10000) {
    await email.send(
      ['admin@empresa.com'],
      'Pedido de Alto Valor',
      \`Um pedido de R$ \${valor.toFixed(2)} foi criado e requer atencao.\`
    );
  }
})();`,
              description:
                'Notifica o administrador sobre pedidos de alto valor',
            },
            {
              title: 'Log de auditoria',
              code: `(async () => {
  const action = context.isNew ? 'criou' : 'editou';
  console.log(\`Usuario \${context.userId} \${action} registro em \${utils.now()}\`);
})();`,
              description: 'Registra acoes no log para auditoria',
            },
          ],
        },
      ],
    },
  };

  return tutorials[hook];
}

/**
 * Returns the general API documentation
 */
export function getApiDocumentation(): Array<TutorialSection> {
  return [
    {
      title: 'API field - Manipulacao de Campos',
      description:
        'Use a API field para ler e modificar valores dos campos do formulario.',
      examples: [
        {
          title: 'field.get(slug)',
          code: `(async () => {
  // Obtem o valor de um campo
  const titulo = field.get('titulo');
  const dataNasc = field.get('data-nascimento');
  console.log(titulo, dataNasc);
})();`,
          description: 'Retorna o valor atual do campo especificado',
        },
        {
          title: 'field.set(slug, value)',
          code: `(async () => {
  // Define o valor de um campo
  field.set('total', 150.75);
  field.set('status', 'aprovado');
  field.set('data-vencimento', utils.now());
})();`,
          description:
            'Define um novo valor para o campo (conversao automatica de tipos)',
        },
        {
          title: 'field.getAll()',
          code: `(async () => {
  // Obtem todos os campos
  const campos = field.getAll();
  console.log(campos);
})();`,
          description: 'Retorna um objeto com todos os campos e seus valores',
        },
      ],
    },
    {
      title: 'API context - Contexto de Execucao',
      description:
        'Informacoes sobre o contexto atual de execucao (somente leitura).',
      examples: [
        {
          title: 'Propriedades disponiveis',
          code: `(async () => {
  // Verificar se e novo registro
  if (context.isNew) {
    // Logica para novos registros
  }

  // Verificar acao do usuario
  // 'novo_registro' | 'editar_registro' | 'excluir_registro' | 'carregamento_formulario'
  if (context.action === 'editar_registro') {
    // Logica para edicao
  }

  // Momento de execucao
  // 'carregamento_formulario' | 'antes_salvar' | 'depois_salvar'
  console.log(context.moment);

  // ID do usuario e tabela
  console.log(context.userId);
  console.log(context.table._id);
})();`,
          description: 'Propriedades do contexto de execucao',
        },
        {
          title: 'Acessar informacoes da tabela',
          code: `(async () => {
  // Nome da tabela
  console.log('Tabela:', context.table.name);

  // Usar slug da tabela para gerar codigo
  const prefixo = context.table.slug.toUpperCase();
  field.set('codigo', prefixo + '-' + utils.uuid().substring(0, 8));

  // ID da tabela
  console.log('ID:', context.table._id);
})();`,
          description: 'Propriedades da tabela atual via context.table',
        },
      ],
    },
    {
      title: 'API email - Envio de E-mails',
      description: 'Funcoes para enviar e-mails (assincronas - use await).',
      examples: [
        {
          title: 'email.send()',
          code: `(async () => {
  // Enviar e-mail simples
  const resultado = await email.send(
    ['destinatario@email.com', 'outro@email.com'],
    'Assunto do E-mail',
    'Corpo do e-mail em texto ou HTML'
  );

  if (resultado.success) {
    console.log('E-mail enviado para', resultado.recipients, 'destinatarios');
  }
})();`,
          description: 'Envia e-mail com corpo personalizado',
        },
        {
          title: 'email.sendTemplate()',
          code: `(async () => {
  // Enviar e-mail com template
  await email.sendTemplate(
    ['cliente@email.com'],
    'Bem-vindo!',
    'Sua conta foi criada com sucesso.',
    { nome: 'Joao', codigo: '12345' }
  );
})();`,
          description: 'Envia e-mail usando template do sistema',
        },
      ],
    },
    {
      title: 'API utils - Utilitarios',
      description: 'Funcoes utilitarias para operacoes comuns.',
      examples: [
        {
          title: 'Datas',
          code: `(async () => {
  // Data de hoje (meia-noite)
  const hoje = utils.today();

  // Data/hora atual
  const agora = utils.now();

  // Formatar data
  const formatada = utils.formatDate(agora, 'dd/MM/yyyy HH:mm');
  console.log(formatada);
})();`,
          description: 'Funcoes para manipulacao de datas',
        },
        {
          title: 'Criptografia e IDs',
          code: `(async () => {
  // Gerar hash SHA256
  const hash = utils.sha256('texto para hash');

  // Gerar UUID unico
  const id = utils.uuid();
  console.log(hash, id);
})();`,
          description: 'Funcoes para hash e geracao de IDs unicos',
        },
      ],
    },
  ];
}
