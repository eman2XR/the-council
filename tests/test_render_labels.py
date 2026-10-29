import unittest

from lab.render import label_checks, label_words


class LabelBudgetTest(unittest.TestCase):
    def test_words_count_only_real_words(self):
        self.assertEqual(label_words('↑ energy'), 1)
        self.assertEqual(label_words('70%'), 1)
        self.assertEqual(label_words('“it” → animal'), 2)

    def test_a_calm_picture_passes(self):
        checks = label_checks([['WALL', 'TRAP', 'WALL', '↑ energy', 'fades', 'grows: impossible'], ['the particle’s wave']])
        self.assertTrue(all(c['pass'] for c in checks), checks)

    def test_too_many_words_at_once_fails(self):
        crowded = ['wall height: the energy it takes', 'grows without end', 'needed: fades', 'fades away', 'energy', 'TRAP']
        checks = label_checks([crowded])
        self.assertFalse(checks[0]['pass'])

    def test_a_sentence_label_fails(self):
        checks = label_checks([['impossible: the particle would be deep in the wall']])
        self.assertFalse(checks[1]['pass'])


if __name__ == '__main__':
    unittest.main()
