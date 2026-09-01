import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SiteContentTests(unittest.TestCase):
    def test_no_noterro_links_remain(self):
        offenders = []
        for path in ROOT.glob('*.html'):
            if 'atmmobility.noterro.com' in path.read_text(encoding='utf-8'):
                offenders.append(path.name)
        self.assertEqual(offenders, [])

    def test_adaptive_training_card_uses_existing_adaptive_hero_asset(self):
        text = (ROOT / 'services.html').read_text(encoding='utf-8')
        start = text.index('<a href="adaptive-training.html" class="scard">')
        end = text.index('</a>', start)
        card = text[start:end]
        self.assertIn('src="adaptive.jpg"', card)
        self.assertNotIn('src="fst.jpg"', card)
        self.assertTrue((ROOT / 'adaptive.jpg').exists())

if __name__ == '__main__':
    unittest.main()
