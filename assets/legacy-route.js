const target = document.body.dataset.target;
const fragments = {
  'personal-training.html': ['personal-training'],
  'therapeutic-services.html': ['therapeutic-care', 'fst', 'hot-stone', 'thai'],
  'team.html': ['team'],
  'our-space.html': ['centre', 'practitioner-space']
};

if (target) {
  const destination = new URL(target, location.href);
  destination.search = location.search;
  const sourceName = location.pathname.split('/').pop();
  if ((fragments[sourceName] || []).includes(location.hash.slice(1))) {
    destination.hash = location.hash;
  }
  location.replace(destination.href);
}
