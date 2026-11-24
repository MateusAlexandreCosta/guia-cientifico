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
            <thead><tr><th scope="col">Nº</th><th scope="col">Capítulo</th><th scope="col">Autores</th><th scope="col">Acesso</th></tr></thead>
            <tbody>${book.chapters.map(ch => `<tr>
                <td class="gc-chapter-number">${esc(ch.number)}</td>
                <td><strong>${esc(ch.title)}</strong>${ch.section ? `<span class="gc-chapter-section">${esc(ch.section)}</span>` : ''}</td>
                <td>${esc(ch.authors)}</td>
                <td><a class="gc-chapter-link" href="${esc(ch.accessUrl || 'https://www.google.com')}" target="_blank" rel="noopener noreferrer" aria-label="Acessar capítulo ${esc(ch.number)}">Acessar ↗</a></td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gc-modal-active');
    modal.querySelector('.gc-modal-panel').focus();
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
                if (e.key === 'Escape') closeChapterModal();
                if (e.key === 'Tab' && $('#chapter-modal').classList.contains('is-open')) {
                    const focusable = [...$('#chapter-modal').querySelectorAll('button, a[href]')];
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