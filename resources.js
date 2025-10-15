const resourcesConfig = [
    {
        id: "introduction",
        file: "resources/introduction.md"
    },
    {
        id: "alimentation",
        file: "resources/alimentation.md"
    },
    {
        id: "soutien",
        file: "resources/soutien.md"
    }
];

const resourcesState = {
    items: [],
    activeId: null,
    selectedCategories: new Set()
};

async function initializeResources() {
    const gridContainer = document.getElementById("resources-grid");
    const modalRoot = document.getElementById("resource-modal");

    if (!gridContainer || !modalRoot) {
        return;
    }

    // Load useful links
    loadUsefulLinks();

    const items = await Promise.all(resourcesConfig.map(loadResourceMeta));
    resourcesState.items = items.filter(Boolean);

    renderResourceGrid(gridContainer);
    setupModalListeners(modalRoot);
}

function loadUsefulLinks() {
    const linksContainer = document.getElementById("useful-links-list");
    
    if (!linksContainer) {
        return;
    }

    // Check if Papa Parse is available (from annuaire page)
    if (typeof Papa !== 'undefined') {
        // Use Papa Parse if available
        const basePath = getBasePath();
        Papa.parse(`${basePath}useful-links.csv`, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (!results.data || results.data.length === 0) {
                    linksContainer.innerHTML = '<p class="loading-message">Aucun lien disponible pour le moment.</p>';
                    return;
                }

                const linksHTML = results.data.map(link => {
                    if (!link.name || !link.url) return '';
                    
                    return `
                        <div class="link-item">
                            <div class="link-info">
                                <h3 class="link-name">${link.name}</h3>
                                <p class="link-description">${link.description || ''}</p>
                            </div>
                            <div class="link-action">
                                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-button">
                                    Visiter
                                </a>
                            </div>
                        </div>
                    `;
                }).filter(Boolean).join('');

                linksContainer.innerHTML = linksHTML || '<p class="loading-message">Aucun lien disponible pour le moment.</p>';
            },
            error: function(error) {
                console.error('Erreur lors du chargement des liens:', error);
                linksContainer.innerHTML = '<p class="loading-message">Erreur lors du chargement des liens.</p>';
            }
        });
    } else {
        // Fallback: manual CSV parsing for simple cases
        const basePath = getBasePath();
        fetch(`${basePath}useful-links.csv`)
            .then(response => response.text())
            .then(csvText => {
                const lines = csvText.trim().split('\n').filter(line => line.trim());
                
                if (lines.length <= 1) {
                    linksContainer.innerHTML = '<p class="loading-message">Aucun lien disponible pour le moment.</p>';
                    return;
                }

                // Parse header
                const headers = lines[0].split(',').map(h => h.trim());
                const nameIdx = headers.indexOf('name');
                const descIdx = headers.indexOf('description');
                const urlIdx = headers.indexOf('url');

                // Parse data rows
                const linksHTML = lines.slice(1).map(line => {
                    // Split by comma, but handle quoted fields
                    const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
                    const values = parts.map(p => p.replace(/^"|"$/g, '').trim());
                    
                    const name = values[nameIdx] || '';
                    const description = values[descIdx] || '';
                    const url = values[urlIdx] || '';
                    
                    if (!name || !url) return '';
                    
                    return `
                        <div class="link-item">
                            <div class="link-info">
                                <h3 class="link-name">${name}</h3>
                                <p class="link-description">${description}</p>
                            </div>
                            <div class="link-action">
                                <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-button">
                                    Visiter
                                </a>
                            </div>
                        </div>
                    `;
                }).filter(Boolean).join('');

                linksContainer.innerHTML = linksHTML || '<p class="loading-message">Aucun lien disponible pour le moment.</p>';
            })
            .catch(error => {
                console.error('Erreur lors du chargement des liens:', error);
                linksContainer.innerHTML = '<p class="loading-message">Erreur lors du chargement des liens.</p>';
            });
    }
}

async function loadResourceMeta(resource) {
    try {
        // Get the base path for GitHub Pages compatibility
        const basePath = getBasePath();
        const resourcePath = `${basePath}${resource.file}`;
        
        console.log(`Fetching resource: ${resource.file} from path: ${resourcePath}`);
        const response = await fetch(resourcePath);
        if (!response.ok) {
            console.error(`Failed to load ${resource.file} - Status: ${response.status} ${response.statusText}`);
            throw new Error(`Impossible de charger ${resource.file} (tried: ${resourcePath}, status: ${response.status})`);
        }

        const text = await response.text();
        console.log(`Successfully loaded ${resource.file}, length: ${text.length}`);
        const { metadata, content } = parseFrontMatter(text);

        return {
            id: resource.id,
            file: resource.file,
            metadata,
            rawContent: content
        };
    } catch (error) {
        console.error('Error loading resource:', error);
        return null;
    }
}

function getBasePath() {
    // Get the base path from the current location
    // For GitHub Pages: /Website/ or /
    // For local: /
    const path = window.location.pathname;
    
    // Remove the filename from the path to get the directory
    const lastSlashIndex = path.lastIndexOf('/');
    const basePath = lastSlashIndex >= 0 ? path.substring(0, lastSlashIndex + 1) : './';
    
    console.log('Base path calculated:', basePath, 'from pathname:', path);
    return basePath;
}

function parseFrontMatter(text) {
    const delimiter = "---";
    let metadata = {};
    let content = text;

    if (text.startsWith(delimiter)) {
        const endIndex = text.indexOf(`\n${delimiter}`, delimiter.length);
        if (endIndex !== -1) {
            const rawMetadata = text.substring(delimiter.length, endIndex).trim();
            metadata = rawMetadata.split(/\r?\n/).reduce((acc, line) => {
                const separatorIndex = line.indexOf(":");
                if (separatorIndex !== -1) {
                    const key = line.substring(0, separatorIndex).trim();
                    const value = line.substring(separatorIndex + 1).trim().replace(/^"|"$/g, "");
                    acc[key] = value;
                }
                return acc;
            }, {});

            content = text.substring(endIndex + delimiter.length + 1).trimStart();
        }
    }

    return { metadata, content };
}

function renderResourceGrid(container) {
    if (!resourcesState.items.length) {
        container.innerHTML = '<p class="resource-empty">Aucune ressource disponible pour le moment.</p>';
        return;
    }

    const sortedItems = [...resourcesState.items].sort((a, b) => {
        const aTop = a.metadata.top === 'true' || a.metadata.top === true;
        const bTop = b.metadata.top === 'true' || b.metadata.top === true;
        if (aTop && !bTop) return -1;
        if (!aTop && bTop) return 1;
        return 0;
    });

    // Populate category buttons
    const allCategories = new Set();
    sortedItems.forEach(item => {
        if (item.metadata.categories) {
            item.metadata.categories.split(',').forEach(cat => allCategories.add(cat.trim()));
        }
    });
    
    const categoryButtonsContainer = document.getElementById('resources-category-buttons');
    categoryButtonsContainer.innerHTML = '';
    
    Array.from(allCategories).sort().forEach(cat => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = cat;
        button.dataset.category = cat;
        button.addEventListener('click', () => {
            toggleCategory(cat, button, sortedItems, container);
        });
        categoryButtonsContainer.appendChild(button);
    });

    renderFilteredResources(sortedItems, container);
}

function toggleCategory(category, button, sortedItems, container) {
    if (resourcesState.selectedCategories.has(category)) {
        resourcesState.selectedCategories.delete(category);
        button.classList.remove('active');
    } else {
        resourcesState.selectedCategories.add(category);
        button.classList.add('active');
    }
    
    renderFilteredResources(sortedItems, container);
}

function renderFilteredResources(sortedItems, container) {
    let filteredItems = sortedItems;
    
    if (resourcesState.selectedCategories.size > 0) {
        filteredItems = sortedItems.filter(item => {
            if (!item.metadata.categories) return false;
            const itemCategories = item.metadata.categories.split(',').map(cat => cat.trim());
            return itemCategories.some(cat => resourcesState.selectedCategories.has(cat));
        });
    }
    
    container.innerHTML = filteredItems
        .map(item => createResourceCard(item))
        .join("\n");

    container.querySelectorAll("[data-resource-id]").forEach(card => {
        card.addEventListener("click", () => {
            openResourceModal(card.dataset.resourceId);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openResourceModal(card.dataset.resourceId);
            }
        });
    });
}

function createResourceCard(item) {
    const { id, metadata } = item;
    const isTop = metadata.top === 'true' || metadata.top === true;
    const plainTitle = metadata.title || formatTitleFromId(id);
    const title = (isTop ? '<span class="star-icon">★</span> ' : '') + plainTitle;
    const summary = metadata.summary || "Découvrez cette ressource";
    const date = metadata.date ? formatDate(metadata.date) : null;

    const metaMarkup = date ? `<p class="resource-meta">${date}</p>` : "";

    return `
        <article class="resource-card" id="resource-card-${id}" data-resource-id="${id}" role="button" tabindex="0" aria-label="Lire ${plainTitle}">
            <h2>${title}</h2>
            ${metaMarkup}
            <p class="resource-summary">${summary}</p>
        </article>
    `;
}

function openResourceModal(resourceId) {
    const modalRoot = document.getElementById("resource-modal");
    if (!modalRoot) return;

    const item = resourcesState.items.find(entry => entry.id === resourceId);
    if (!item) return;

    const modalBody = modalRoot.querySelector(".resource-modal__body");
    if (!modalBody) return;

    resourcesState.activeId = resourceId;

    const title = item.metadata.title || formatTitleFromId(item.id);
    const content = convertMarkdownToHtml(item.rawContent);
    
    modalBody.innerHTML = `
        <h2 id="resource-modal-title">${escapeHtml(title)}</h2>
        ${content}
    `;

    modalRoot.setAttribute("aria-hidden", "false");
    modalRoot.querySelector(".resource-modal__dialog")?.focus();
}

function closeResourceModal() {
    const modalRoot = document.getElementById("resource-modal");
    if (!modalRoot) return;

    modalRoot.setAttribute("aria-hidden", "true");
    modalRoot.querySelector(".resource-modal__body").innerHTML = "";
}

function setupModalListeners(modalRoot) {
    modalRoot.querySelectorAll("[data-close-modal]").forEach(element => {
        element.addEventListener("click", closeResourceModal);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modalRoot.getAttribute("aria-hidden") === "false") {
            closeResourceModal();
        }
    });
}

function convertMarkdownToHtml(markdown) {
    const lines = markdown.split(/\r?\n/);
    const html = [];
    let inList = false;

    lines.forEach(line => {
        const trimmed = line.trim();

        if (!trimmed) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            return;
        }

        if (trimmed.startsWith("# ")) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push(`<h1>${escapeHtml(trimmed.substring(2).trim())}</h1>`);
            return;
        }

        if (trimmed.startsWith("## ")) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push(`<h2>${escapeHtml(trimmed.substring(3).trim())}</h2>`);
            return;
        }

        if (trimmed.startsWith("### ")) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            html.push(`<h3>${escapeHtml(trimmed.substring(4).trim())}</h3>`);
            return;
        }

        if (trimmed.startsWith("- ")) {
            if (!inList) {
                html.push("<ul>");
                inList = true;
            }
            html.push(`<li>${escapeHtml(trimmed.substring(2).trim())}</li>`);
            return;
        }

        if (inList) {
            html.push("</ul>");
            inList = false;
        }

        html.push(`<p>${escapeHtml(trimmed)}</p>`);
    });

    if (inList) {
        html.push("</ul>");
    }

    return html.join("\n");
}

function formatTitleFromId(id) {
    return id
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function escapeHtml(text) {
    const span = document.createElement("span");
    span.textContent = text;
    return span.innerHTML;
}

document.addEventListener("DOMContentLoaded", initializeResources);
