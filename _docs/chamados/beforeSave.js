/* =============================================================================
 * Chamados — beforeSave
 * -----------------------------------------------------------------------------
 * Cole este código no método `beforeSave` da tabela "Chamados"
 * (Configurações da tabela → Métodos → beforeSave).
 *
 * ⚠️ DEPENDE das APIs de sandbox `users.resolve(...)` e `notify.send(...)`
 *    (extensão em backend/application/core/table/sandbox.ts + types.ts e
 *    context.reentrant/previous). Se essas mudanças de backend não estiverem
 *    aplicadas, o script falha em `users`/`notify`.
 *
 * O QUE FAZ
 *   • Ao CRIAR ou ALTERAR um chamado: envia email + cria notificação in-app
 *     para o Atendente, os usuários de Acompanhamento e quem criou (creator).
 *   • Ao adicionar uma MENSAGEM nova no grupo "Mensagens": envia email +
 *     notificação para todos os anteriores E para os usuários do campo
 *     "Informar" daquela mensagem.
 *
 * APIs usadas (sandbox):
 *   field.get / field.getLabel        → leitura de campos do registro
 *   context.isNew / .reentrant / .previous / .userId / .appUrl / .table
 *   users.resolve(ids) → [{ _id, name, email }]   (resolve id → email)
 *   email.sendTemplate(to[], assunto, msg, data?) (envio de email)
 *   notify.send({ userIds, title, body, action, source })  (notificação in-app)
 * ========================================================================== */
(async () => {
  const isCreate = context.isNew === true;

  // Dispara uma única vez por operação:
  // - create: age só no passe de hook (já tem _id para o link)
  // - update: age só no passe do controller (ignora reações/itens de grupo)
  if (isCreate && !context.reentrant) return;
  if (!isCreate && context.reentrant) return;

  // ---- helpers --------------------------------------------------------------
  // Normaliza qualquer formato de id (string, ObjectId, objeto populado { _id },
  // arrays e arrays aninhados) numa lista de strings únicas.
  const toIds = (value) => {
    const out = [];
    const push = (v) => {
      if (!v) return;
      if (Array.isArray(v)) {
        v.forEach(push);
        return;
      }
      if (typeof v === 'string') {
        if (v.trim()) out.push(v.trim());
        return;
      }
      if (typeof v === 'object') {
        const nested = v._id || v.id;
        if (nested) {
          const s = String(nested);
          if (s && s !== '[object Object]') out.push(s);
          return;
        }
        const s = String(v); // ObjectId → hex
        if (s && s !== '[object Object]') out.push(s);
        return;
      }
      out.push(String(v));
    };
    push(value);
    return Array.from(new Set(out));
  };

  const stripHtml = (text) =>
    String(text || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);

  const slug = context.table.slug;
  const rowId = String(field.get('_id') || '');
  const titulo = String(field.get('titulo') || 'Chamado');
  const link =
    context.appUrl + '/tables/' + slug + (rowId ? '?rowId=' + rowId : '');

  // ---- destinatários do chamado --------------------------------------------
  const ticketIds = toIds([
    field.get('atendente'),
    field.get('acompanhamento'),
    field.get('creator'),
  ]);

  const ticketUsers = await users.resolve(ticketIds);
  const ticketEmails = Array.from(
    new Set(ticketUsers.map((u) => u.email).filter(Boolean)),
  );

  const assunto = isCreate
    ? 'Novo chamado: ' + titulo
    : 'Chamado atualizado: ' + titulo;

  if (ticketEmails.length > 0) {
    // Fire-and-forget: não bloqueia o save se o SMTP estiver lento.
    email.sendTemplate(
      ticketEmails,
      assunto,
      isCreate
        ? 'Um novo chamado foi criado.'
        : 'Um chamado que você acompanha foi atualizado.',
      {
        'Título': titulo,
        'Tipo': field.getLabel('tipo'),
        'Situação': field.getLabel('situacao'),
        'Severidade': field.getLabel('severidade'),
        'Acessar': link,
      },
    );
  }

  notify.send({
    userIds: ticketIds,
    title: assunto,
    body: titulo,
    action: { type: 'route', href: '/tables/' + slug + (rowId ? '?rowId=' + rowId : ''), label: 'Abrir chamado' },
    source: { tableSlug: slug, rowId: rowId || null },
  });

  // ---- novas mensagens do grupo "Mensagens" --------------------------------
  const messages = field.get('mensagens');
  const msgArr = Array.isArray(messages) ? messages : [];

  // Estado anterior só existe no update; no create todas as mensagens são novas.
  const prev = context.previous;
  const prevCount =
    prev && Array.isArray(prev.mensagens) ? prev.mensagens.length : 0;

  // Mensagens são append-only no formulário: as novas excedem a contagem anterior.
  const newMessages = msgArr.slice(prevCount);

  for (const m of newMessages) {
    if (!m || typeof m !== 'object') continue;

    const informarIds = toIds(m.informar);
    const recipientIds = Array.from(new Set([...ticketIds, ...informarIds]));

    const informarUsers = await users.resolve(informarIds);
    const recipientEmails = Array.from(
      new Set([
        ...ticketEmails,
        ...informarUsers.map((u) => u.email).filter(Boolean),
      ]),
    );

    const trecho = stripHtml(m.mensagem);

    if (recipientEmails.length > 0) {
      email.sendTemplate(
        recipientEmails,
        'Nova mensagem no chamado: ' + titulo,
        'Uma nova mensagem foi adicionada ao chamado.',
        {
          'Chamado': titulo,
          'Mensagem': trecho,
          'Acessar': link,
        },
      );
    }

    notify.send({
      userIds: recipientIds,
      title: 'Nova mensagem: ' + titulo,
      body: trecho,
      action: { type: 'route', href: '/tables/' + slug + (rowId ? '?rowId=' + rowId : ''), label: 'Abrir chamado' },
      source: { tableSlug: slug, rowId: rowId || null },
    });
  }
})();
