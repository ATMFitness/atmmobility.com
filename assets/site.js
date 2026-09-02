const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('#site-menu');

if (toggle && menu) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };

  document.documentElement.classList.add('js');
  toggle.hidden = false;

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  matchMedia('(min-width:1101px)').addEventListener('change', () => setOpen(false));
}

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const fields = new FormData(contactForm);
    const value = (key) => String(fields.get(key) || '').trim();
    const subject = encodeURIComponent('Inquiry: ' + value('service'));
    const body = encodeURIComponent(
      'Name: ' + value('name') + '\n' +
      'Email: ' + value('email') + '\n' +
      'Service: ' + value('service') + '\n\n' +
      value('message')
    );
    const status = document.querySelector('[data-contact-status]');
    if (status) {
      status.textContent = 'Opening your email app. Nothing has been sent. If it does not open, email info@atmmobility.com directly.';
    }
    window.location.href = 'mailto:info@atmmobility.com?subject=' + subject + '&body=' + body;
  });
}
