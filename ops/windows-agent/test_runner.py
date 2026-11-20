import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path
import runner

class SelectionTests(unittest.TestCase):
    def test_oldest_and_report_skip(self):
        a, b = 'HM-20261110-1930-C01', 'HM-20261110-2000-C02'
        paths = {f'agents/to-codex/{a}.md', f'agents/to-codex/{b}.md',
                 f'agents/to-chatgpt/{a}-result.md', 'agents/to-codex/../../bad.md'}
        self.assertEqual(runner.pending(paths), [b])

    def test_dry_run_never_claims_or_runs_agent(self):
        with tempfile.TemporaryDirectory() as d:
            def fake_api(path, data=None):
                self.assertIsNone(data)
                return []
            with patch('sys.argv', ['runner.py', '--state', d]), \
                 patch.object(runner, 'snapshot', return_value=('sha', {'agents/to-codex/HM-20261110-2000-C02.md'})), \
                 patch.object(runner, 'api', side_effect=fake_api), \
                 patch.object(runner, 'run', return_value=''), \
                 patch.object(runner.shutil, 'which', return_value='tool'), \
                 patch.object(runner.subprocess, 'Popen') as popen:
                runner.main()
                popen.assert_not_called()
                self.assertEqual(list(Path(d).iterdir()), [])

    def test_remote_claim_or_existing_pr_skips_agent(self):
        task = 'HM-20261110-2000-C02'
        for mode in ('claim', 'pr'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as d:
                (Path(d)/'ENABLED').touch()
                def fake_api(path, data=None):
                    self.assertIsNone(data)
                    if path.startswith('pulls'):
                        return [{'title': task, 'body': '', 'head': {'ref': 'feature'}}] if mode == 'pr' else []
                    return [{'ref': 'refs/tags/codex-claims/' + task}] if mode == 'claim' else []
                with patch('sys.argv', ['runner.py', '--state', d, '--execute']), \
                     patch.object(runner, 'snapshot', return_value=('sha', {'agents/to-codex/' + task + '.md'})), \
                     patch.object(runner, 'api', side_effect=fake_api), \
                     patch.object(runner, 'run', return_value=''), \
                     patch.object(runner.shutil, 'which', return_value='tool'), \
                     patch.object(runner.subprocess, 'Popen') as popen:
                    runner.main()
                    popen.assert_not_called()
                    self.assertFalse((Path(d)/(task + '.claimed')).exists())

    def test_disabled_execution_exits_before_network(self):
        with tempfile.TemporaryDirectory() as d:
            with patch('sys.argv', ['runner.py', '--state', d, '--execute']), \
                 patch.object(runner, 'snapshot') as snap:
                runner.main()
                snap.assert_not_called()

    def test_lock_prevents_execution(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'running.lock').mkdir()
            with patch('sys.argv', ['runner.py', '--state', d]), \
                 patch.object(runner, 'snapshot') as snap:
                runner.main()
                snap.assert_not_called()

if __name__ == '__main__':
    unittest.main()
