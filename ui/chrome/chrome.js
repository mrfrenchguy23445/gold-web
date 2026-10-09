document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const pageFrame = document.getElementById('pageFrame');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const targetPage = item.getAttribute('data-page');
            pageFrame.src = `../pages/${targetPage}.html`;
        });
    });
});