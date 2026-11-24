const cache = new Map();

async function data(name) {
    if (!cache.has(name)) {
        const r = await fetch(`data/${name}.json`);
        if (!r.ok) throw new Error(`Falha ao carregar ${name}`);
        cache.set(name, await r.json());
    }
    return cache.get(name);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const palette = ['#e9784e', '#238eac', '#3fa98c', '#e3a532', '#9b5da3', '#dc6979'];

const $ = s => document.querySelector(s);

function instrumentCard(x, i) {
    return `<div class="col-md-6 col-xl-4">
        <article class="simple-card" style="--accent:${palette[i % palette.length]}">
            <p class="meta">${esc(x.category)}</p>
            <h3>${esc(x.short)} <span class="fw-normal">— ${esc(x.name)}</span></h3>
            <p>${esc(x.description)}</p>
            <p class="small mb-3">${esc(x.authors)} · ${esc(x.year)}</p>
            <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Fonte original ↗</a>
        </article>
    </div>`;
}

function toolCard(x, i) {
    return `<div class="col-md-6 col-xl-4">
        <article class="simple-card" style="--accent:${palette[i % palette.length]}">
            <p class="meta">${esc(x.category)}</p>
            <h3>${esc(x.name)}</h3>
            <p>${esc(x.description)}</p>
            <p class="small muted">Responsável: ${esc(x.responsible || "Consultar fonte original")}</p>
            <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Acessar ferramenta ↗</a>
        </article>
    </div>`;
}

function bookCard(x) {
    return `<div class="col-lg-4">
        <article class="simple-card book-card" style="--accent:${palette[(x.number + 1) % palette.length]}">
            <img class="book-cover" src="${esc(x.cover)}" alt="Capa do volume ${x.number}" loading="lazy">
            <div>
                <p class="book-tag">CEIE/SBC · Volume ${x.number}</p>
                <h3>${esc(x.title)}</h3>
                <p>${esc(x.description)}</p>
                <a href="#materiais" role="button" aria-haspopup="dialog" data-book="${esc(x.id)}">Ver capítulos ↓</a>
            </div>
        </article>
    </div>`;
}

function optionalLink(url, label) {
    return url
        ? `<a class="btn btn-sm btn-outline-dark" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
        : `<span class="pending-link" title="Endereço a preencher no arquivo JSON">${label} · link a inserir</span>`;
}

let chapterModalPreviousFocus = null;

function closeChapterModal() {
    const modal = $('#chapter-modal');
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gc-modal-active');
    chapterModalPreviousFocus?.focus();
}

function chapterBrowser(book) {
    const modal = $('#chapter-modal');
    if (!modal || !book) return;
    chapterModalPreviousFocus = document.activeElement;
    $('#gc-modal-kicker').textContent = `CEIE/SBC · VOLUME ${book.number} · ${book.chapters.length} CAPÍTULOS`;
    $('#gc-modal-title').textContent = book.title;
    $('#gc-modal-body').innerHTML = `
        <div class="gc-volume-info">
            <p><strong>Organizadores:</strong> ${esc(book.editors)}</p>
            ${book.isbn ? `<p><strong>ISBN:</strong> ${esc(book.isbn)}</p>` : ''}
            <a href="${esc(book.url)}" target="_blank" rel="noopener noreferrer">Consultar volume na CEIE/SBC ↗</a>
        </div>
        <div class="gc-table-scroll"><table class="gc-chapter-table">
            <thead><tr><th scope="col">Nº</th><th scope="col">Capítulo</th><th scope="col">Autores</th><th scope="col">Acesso</th><th scope="col">Como citar</th></tr></thead>
            <tbody>${book.chapters.map(ch => `<tr>
                <td class="gc-chapter-number">${esc(ch.number)}</td>
                <td><strong>${esc(ch.title)}</strong>${ch.section ? `<span class="gc-chapter-section">${esc(ch.section)}</span>` : ''}</td>
                <td>${esc(ch.authors)}</td>
                <td><a class="gc-chapter-link" href="${esc(ch.accessUrl || book.url)}" target="_blank" rel="noopener noreferrer" aria-label="Acessar capítulo ${esc(ch.number)}">Acessar ↗</a></td>
                <td>${book.citation && ch.authorsABNT
                    ? `<button type="button" class="gc-cite-btn" data-cite-book="${esc(book.id)}" data-cite-chapter="${esc(ch.number)}" aria-label="Como citar o capítulo ${esc(ch.number)}">❝ Citar</button>`
                    : ''}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    modal.querySelectorAll('[data-cite-chapter]').forEach(btn => btn.addEventListener('click', () => {
        const ch = book.chapters.find(c => String(c.number) === btn.dataset.citeChapter);
        if (ch) openCitationModal(book, ch);
    }));
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gc-modal-active');
    modal.querySelector('.gc-modal-panel').focus();
}

/* ---------- Como citar (ABNT NBR 6023:2018 e BibTeX) ---------- */

const MESES_ABNT = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

// Acrescenta ponto final, exceto quando o texto já termina com pontuação.
const comPonto = s => /[.?!…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`;

function citacaoABNT(book, ch) {
    const c = book.citation;
    const hoje = new Date();
    const acesso = `${hoje.getDate()} ${MESES_ABNT[hoje.getMonth()]} ${hoje.getFullYear()}`;
    const url = ch.accessUrl || book.url;
    const autores = comPonto(ch.authorsABNT.join('; '));
    const titulo = comPonto(ch.title);
    const orgs = `${c.organizers.join('; ')} (org.)`;
    const resto = `${c.place}: ${c.publisher}, ${c.year}. cap. ${ch.number}. (${c.series}, v. ${c.seriesVolume}). Disponível em: ${url}. Acesso em: ${acesso}.`;
    return {
        // título do livro em negrito, como pede a norma
        html: `${esc(autores)} ${esc(titulo)} In: ${esc(orgs)}. <strong>${esc(c.bookTitle)}</strong>: ${esc(c.subtitle)}. ${esc(resto)}`,
        texto: `${autores} ${titulo} In: ${orgs}. ${c.bookTitle}: ${c.subtitle}. ${resto}`,
    };
}

// "CASTRO FILHO, José Aires de" → "Castro Filho, José Aires de"
const nomeBibtex = abnt => {
    const [sobrenome, ...resto] = abnt.split(',');
    const sob = sobrenome.trim().toLocaleLowerCase('pt-BR').replace(/(^|\s)\S/g, l => l.toLocaleUpperCase('pt-BR'));
    return resto.length ? `${sob}, ${resto.join(',').trim()}` : sob;
};

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function citacaoBibtex(book, ch) {
    const c = book.citation;
    const primeiroSobrenome = slug(ch.authorsABNT[0].split(',')[0].split(' ')[0]);
    const palavra = slug(ch.title.split(/\s+/).find(w => w.length > 3) || 'cap');
    const d = new Date(); // data local (toISOString usaria UTC e poderia dar o dia seguinte à noite)
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const capitalizar = s => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);
    const campos = [
        ['author', ch.authorsABNT.map(nomeBibtex).join(' and ')],
        ['title', ch.title],
        ['booktitle', `${c.bookTitle.replace(/informática na educação/i, 'Informática na Educação')}: ${capitalizar(c.subtitle)}`],
        ['editor', c.organizers.map(nomeBibtex).join(' and ')],
        ['publisher', c.publisher],
        ['address', c.place],
        ['year', c.year],
        ['chapter', String(ch.number)],
        ['series', c.series],
        ['volume', String(c.seriesVolume)],
        ['url', ch.accessUrl || book.url],
        ['urldate', hoje],
    ];
    const largura = Math.max(...campos.map(([k]) => k.length));
    return `@incollection{${primeiroSobrenome}${c.year}${palavra},\n` +
        campos.map(([k, v]) => `  ${k.padEnd(largura)} = {${v}}`).join(',\n') +
        '\n}';
}

let citacaoFocoAnterior = null;

function garantirModalCitacao() {
    let modal = $('#cite-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'cite-modal';
    modal.className = 'gc-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="gc-modal-backdrop" data-close-cite></div>
        <section class="gc-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cite-title" tabindex="-1">
            <header class="gc-modal-header">
                <div><p class="gc-modal-kicker" id="cite-kicker"></p><h2 id="cite-title">Como citar</h2></div>
                <button type="button" class="gc-modal-close" data-close-cite aria-label="Fechar janela de citação">&times;</button>
            </header>
            <div class="gc-modal-body">
                <p class="cite-chapter" id="cite-chapter"></p>
                <div class="cite-tabs" role="tablist" aria-label="Formato da citação">
                    <button type="button" role="tab" class="cite-tab is-active" data-formato="abnt" aria-selected="true" aria-controls="cite-abnt">ABNT</button>
                    <button type="button" role="tab" class="cite-tab" data-formato="bibtex" aria-selected="false" aria-controls="cite-bibtex">BibTeX</button>
                </div>
                <div class="cite-box" id="cite-abnt" role="tabpanel"></div>
                <pre class="cite-box cite-bibtex" id="cite-bibtex" role="tabpanel" hidden></pre>
                <div class="cite-actions">
                    <button type="button" class="cite-copy" id="cite-copy">Copiar citação</button>
                    <span class="cite-feedback" id="cite-feedback" role="status"></span>
                </div>
                <p class="cite-note" id="cite-note"></p>
            </div>
        </section>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target.closest('[data-close-cite]')) fecharModalCitacao();
        const aba = e.target.closest('.cite-tab');
        if (aba) mostrarFormato(aba.dataset.formato);
    });
    $('#cite-copy').addEventListener('click', async () => {
        const formato = modal.querySelector('.cite-tab.is-active').dataset.formato;
        const texto = formato === 'abnt' ? modal.dataset.abnt : $('#cite-bibtex').textContent;
        try {
            await navigator.clipboard.writeText(texto);
            $('#cite-feedback').textContent = 'Copiado!';
        } catch {
            // sem permissão de área de transferência: seleciona o texto para o usuário copiar
            const alvo = formato === 'abnt' ? $('#cite-abnt') : $('#cite-bibtex');
            getSelection().selectAllChildren(alvo);
            $('#cite-feedback').textContent = 'Selecionado: use Ctrl+C / ⌘+C.';
        }
        setTimeout(() => { $('#cite-feedback').textContent = ''; }, 2500);
    });
    return modal;
}

function mostrarFormato(formato) {
    const modal = $('#cite-modal');
    modal.querySelectorAll('.cite-tab').forEach(t => {
        const ativo = t.dataset.formato === formato;
        t.classList.toggle('is-active', ativo);
        t.setAttribute('aria-selected', String(ativo));
    });
    $('#cite-abnt').hidden = formato !== 'abnt';
    $('#cite-bibtex').hidden = formato !== 'bibtex';
    $('#cite-note').textContent = formato === 'abnt'
        ? 'Formato ABNT NBR 6023:2018 para capítulo de livro. O título do livro vai em negrito; ao colar no editor, aplique o negrito se ele não vier junto. Confira as normas da sua instituição.'
        : 'Entrada @incollection (capítulo em livro organizado). Os acentos funcionam com biblatex/biber ou com \\usepackage[utf8]{inputenc}. O campo urldate é usado pelo biblatex.';
    $('#cite-feedback').textContent = '';
}

function openCitationModal(book, ch) {
    const modal = garantirModalCitacao();
    citacaoFocoAnterior = document.activeElement;
    const abnt = citacaoABNT(book, ch);
    $('#cite-kicker').textContent = `VOL. ${book.number} · CAPÍTULO ${ch.number}`;
    $('#cite-chapter').textContent = ch.title;
    $('#cite-abnt').innerHTML = abnt.html;
    modal.dataset.abnt = abnt.texto;
    $('#cite-bibtex').textContent = citacaoBibtex(book, ch);
    mostrarFormato('abnt');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.gc-modal-panel').focus();
}

function fecharModalCitacao() {
    const modal = $('#cite-modal');
    if (!modal || !modal.classList.contains('is-open')) return false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    citacaoFocoAnterior?.focus();
    return true;
}

function referenceCard(x, i) {
    return `<div class="col-lg-6">
        <article class="simple-card" style="--accent:${palette[i % palette.length]}">
            <p class="meta">${esc(x.category)}</p>
            <h3>${esc(x.title)}</h3>
            <p class="small"><strong>Autores:</strong> ${esc(x.authors)}${x.year ? ' · ' + esc(x.year) : ''}</p>
            <p>${esc(x.description)}</p>
            <div class="d-flex gap-2 flex-wrap">
                ${optionalLink(x.url, 'Acessar obra')}
            </div>
        </article>
    </div>`;
}

async function init() {
    const page = location.pathname.split('/').pop().replace('.html', '') || 'index';

    document.querySelectorAll('[data-page]').forEach(a => {
        if (a.dataset.page === page) a.classList.add('active');
    });

    try {
        if ($('#home-instruments')) {
            $('#home-instruments').innerHTML = (await data('instruments'))
                .slice(0, 3)
                .map(instrumentCard)
                .join('');

            $('#home-tools').innerHTML = (await data('tools'))
                .filter(x => ['scispace', 'connected', 'zotero', 'overleaf', 'figma', 'likert'].includes(x.id))
                .map(toolCard)
                .join('');

            $('#home-books').innerHTML = (await data('books'))
                .map(x => `<div class="col-4">
                    <a href="instrumentos.html#materiais" class="d-block text-decoration-none">
                        <img class="book-cover-small mb-2" src="${esc(x.cover)}" alt="Capa volume ${x.number}" loading="lazy">
                        <div class="small fw-semibold">Vol. ${x.number}</div>
                    </a>
                </div>`)
                .join('');
        }

        if ($('#instrument-list')) {
            const all = await data('instruments');
            const cats = [...new Set(all.map(x => x.category))].sort();

            $('#instrument-category').innerHTML += [...cats]
                .map(c => `<option>${esc(c)}</option>`)
                .join('');

            const render = () => {
                const q = $('#instrument-search').value.toLocaleLowerCase('pt-BR');
                const cat = $('#instrument-category').value;

                const list = all.filter(x =>
                    (!cat || x.category === cat) &&
                    [x.short, x.name, x.description, x.authors]
                        .join(' ')
                        .toLocaleLowerCase('pt-BR')
                        .includes(q)
                );

                $('#instrument-list').innerHTML = list.length
                    ? list.map(instrumentCard).join('')
                    : '<p class="empty-state">Nenhum instrumento encontrado.</p>';

                $('#instrument-count').textContent = `${list.length} registros`;
            };

            $('#instrument-search').addEventListener('input', render);
            $('#instrument-category').addEventListener('change', render);

            render();

            const books = await data('books');

            $('#book-list').innerHTML = books.map(bookCard).join('');

            // Delegação de eventos: o clique abre a janela, sem navegar para âncoras.
            document.addEventListener('click', e => {
                const link = e.target.closest('a[data-book]');
                if (!link) return;
                e.preventDefault();
                const selected = books.find(book => book.id === link.dataset.book);
                if (selected) chapterBrowser(selected);
            });

            $('#chapter-modal').addEventListener('click', e => {
                if (e.target.closest('[data-close-chapters]')) closeChapterModal();
            });
            document.addEventListener('keydown', e => {
                // Esc fecha primeiro a janela de citação (que fica por cima), depois a de capítulos.
                if (e.key === 'Escape' && !fecharModalCitacao()) closeChapterModal();
                const citeAberto = $('#cite-modal')?.classList.contains('is-open');
                const ativo = citeAberto ? $('#cite-modal') : $('#chapter-modal');
                if (e.key === 'Tab' && ativo.classList.contains('is-open')) {
                    const focusable = [...ativo.querySelectorAll('button:not([hidden]), a[href]')];
                    const first = focusable[0], last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            });

            if ($('#reference-list')) {
                const refs = await data('references');
                const input = $('#reference-search');

                const renderRefs = () => {
                    const q = input.value.toLocaleLowerCase('pt-BR');

                    const matches = refs.filter(x =>
                        [x.title, x.authors, x.category, x.description]
                            .join(' ')
                            .toLocaleLowerCase('pt-BR')
                            .includes(q)
                    );

                    $('#reference-list').innerHTML = matches.map(referenceCard).join('')
                        || '<p>Nenhuma obra encontrada.</p>';
                };

                input.addEventListener('input', renderRefs);

                renderRefs();
            }
        }

        if ($('#tool-list')) {
            const all = await data('tools');

            $('#tool-category').innerHTML += [...new Set(all.map(x => x.category))]
                .sort()
                .map(c => `<option>${esc(c)}</option>`)
                .join('');

            const render = () => {
                const q = $('#tool-search').value.toLocaleLowerCase('pt-BR');
                const cat = $('#tool-category').value;

                const list = all.filter(x =>
                    (!cat || x.category === cat) &&
                    [x.name, x.description, x.category]
                        .join(' ')
                        .toLocaleLowerCase('pt-BR')
                        .includes(q)
                );

                $('#tool-list').innerHTML = list.length
                    ? list.map(toolCard).join('')
                    : '<p class="empty-state">Nenhuma ferramenta encontrada.</p>';

                $('#tool-count').textContent = `${list.length} ferramentas`;
            };

            $('#tool-search').addEventListener('input', render);
            $('#tool-category').addEventListener('change', render);

            render();
        }
    } catch (e) {
        console.error(e);

        document.querySelector('main').insertAdjacentHTML(
            'beforeend',
            '<div class="container alert alert-warning">Não foi possível carregar o catálogo. Execute o projeto usando um servidor local.</div>'
        );
    }
}

init();