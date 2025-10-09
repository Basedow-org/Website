async function loadHeader() {
    const placeholders = document.querySelectorAll('[data-include="header"]');

    if (!placeholders.length) {
        return;
    }

    try {
        const response = await fetch('partials/header.html');
        if (!response.ok) {
            throw new Error(`Erreur de chargement du header: ${response.status}`);
        }

        const headerHTML = await response.text();

        placeholders.forEach(container => {
            container.innerHTML = headerHTML;
            initializeHeader(container);
        });
    } catch (error) {
        console.error(error);
    }
}

async function loadFooter() {
    const placeholders = document.querySelectorAll('[data-include="footer"]');

    if (!placeholders.length) {
        return;
    }

    try {
        const response = await fetch('partials/footer.html');
        if (!response.ok) {
            throw new Error(`Erreur de chargement du footer: ${response.status}`);
        }

        const footerHTML = await response.text();

        placeholders.forEach(container => {
            container.innerHTML = footerHTML;
        });
    } catch (error) {
        console.error(error);
    }
}

function initializeHeader(container) {
    const navMenu = container.querySelector('#navMenu');
    const menuToggle = container.querySelector('.menu-toggle');
    const navLinks = container.querySelectorAll('.nav-menu a');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu?.classList.remove('active');
        });
    });

    adjustHeaderLinks(container);
}

function adjustHeaderLinks(container) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = container.querySelectorAll('.nav-menu a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        if (href.startsWith('#')) {
            if (currentPage !== 'index.html') {
                link.setAttribute('href', `index.html${href}`);
            }
        } else if (href.startsWith('index.html#') && currentPage === 'index.html') {
            link.setAttribute('href', href.replace('index.html', ''));
        }
    });
}

loadHeader();
loadFooter();
