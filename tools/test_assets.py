import json
import hashlib
import subprocess
import sys
import assets as asset_tools
import struct
import tempfile
import unittest
from pathlib import Path
from assets import read_glb, sha256, dimensions_mm, verify, inventory, sync
import shutil

ROOT = Path(__file__).resolve().parents[1]
VALID = ROOT / 'public/models-runtime/burger-0.glb'

class AssetTests(unittest.TestCase):
    def test_runtime_catalog_has_unified_models_for_every_food_stage(self):
        manifest = json.loads((ROOT / 'assets/manifest.json').read_text(encoding='utf-8'))
        catalog = json.loads((ROOT / 'assets/catalog.json').read_text(encoding='utf-8'))
        expected = {(food['id'], stage) for food in catalog['foods'] for stage in range(food['stageCount'])}
        self.assertEqual({(row['foodId'], row['stage']) for row in manifest['files']}, expected)
        self.assertEqual(len(manifest['files']), len(expected))
        self.assertEqual(manifest['runtimeRoots'], {'unified': 'public/models-runtime'})
        required = {f"public/models-runtime/{food['runtimePrefix']}-{stage}.glb" for food in catalog['foods'] for stage in range(food['stageCount'])}
        self.assertTrue(required.issubset({row['path'] for row in manifest['runtimeFiles']}))

    def test_hash_and_dimensions_match_installed_runtime(self):
        manifest = json.loads((ROOT / 'assets/manifest.json').read_text(encoding='utf-8'))
        item = next(row for row in manifest['runtimeFiles'] if row['path'] == 'public/models-runtime/burger-0.glb')
        self.assertEqual(sha256(VALID), item['sha256'])
        self.assertEqual(VALID.stat().st_size, item['bytes'])
        self.assertEqual(dimensions_mm(VALID), item['dimensionsMm'])

    def test_glb_parser_rejects_invalid_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'invalid.glb'; path.write_bytes(b'no glb')
            with self.assertRaises(ValueError): read_glb(path)

    def test_glb_parser_rejects_zero_padded_json(self):
        # This JSON is 27 bytes, so one padding byte aligns its chunk.
        payload = b'{"asset":{"version":"2.0"}}'
        self.assertEqual(len(payload), 27)
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'zero-json.glb'
            for tail in (b'\0', b'\0    '):
                with self.subTest(tail=tail):
                    chunk = payload + tail
                    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 28 + len(chunk))
                                     + struct.pack('<I4s', len(chunk), b'JSON') + chunk
                                     + struct.pack('<I4s', 0, b'BIN\0'))
                    with self.assertRaises(ValueError):
                        read_glb(path)

    def test_glb_parser_accepts_space_padded_json_and_zero_padded_bin(self):
        chunk = b'{"asset":{"version":"2.0"},"buffers":[{"byteLength":1}]}'
        chunk += b' ' * (-len(chunk) % 4)
        binary = b'\x7f\0\0\0'
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'valid.glb'
            path.write_bytes(struct.pack('<4sII', b'glTF', 2, 28 + len(chunk) + len(binary))
                             + struct.pack('<I4s', len(chunk), b'JSON') + chunk
                             + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
            doc, blob = read_glb(path)
            self.assertEqual(doc['asset']['version'], '2.0')
            self.assertEqual(doc['buffers'], [{'byteLength': 1}])
            self.assertEqual(blob, b'\x7f\0\0\0')

    def test_dynamic_catalog_sync_restores_and_checks_runtime(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            asset_root = root / 'assets'
            asset_root.mkdir()
            catalog = {'schemaVersion': 1, 'foods': [{'id': 'new-food', 'runtimePrefix': 'special', 'stageCount': 1, 'stages': [{'bites': 3, 'calibration': {'scale': 1, 'position': [0, 0, 0], 'yaw': 0}}]}]}
            (asset_root / 'catalog.json').write_text(json.dumps(catalog))
            for variant in ('mobile', 'desktop'):
                target = asset_root / 'new-food/processed' / variant / '0.glb'
                target.parent.mkdir(parents=True)
                shutil.copyfile(VALID, target)
            source = asset_root / 'new-food/source/0.glb'
            source.parent.mkdir(parents=True)
            shutil.copyfile(VALID, source)
            release = {'schemaVersion': 1, 'runtimeRoots': {'unified': 'public/models-runtime'}, 'runtimeFiles': [{'path': 'public/models-runtime/special-0.glb', 'sha256': 'release-hash'}], 'processing': {'method': 'accepted'}, 'files': []}
            (asset_root / 'manifest.json').write_text(json.dumps(release), encoding='utf-8')
            manifest = inventory(root)
            for key in ('runtimeRoots', 'runtimeFiles', 'processing'):
                self.assertEqual(manifest[key], release[key])
            self.assertEqual(manifest['files'][0]['foodId'], 'new-food')
            sync(manifest, root)
            runtime = root / 'public/models-mobile/special-0.glb'
            self.assertTrue(runtime.is_file())
            runtime.write_bytes(b'corrupted')
            with self.assertRaisesRegex(ValueError, 'Runtime hash mismatch'):
                verify(manifest, root)
            sync(manifest, root)
            verify(manifest, root)
            source.write_bytes(b'changed source')
            with self.assertRaisesRegex(ValueError, 'Source hash/size mismatch'):
                verify(manifest, root)
            shutil.copyfile(VALID, source)
            manifest['files'][0]['variants']['mobile']['path'] = '../outside.glb'
            with self.assertRaisesRegex(ValueError, 'Unsafe'):
                verify(manifest, root)

    def test_every_runtime_asset_path_exists(self):
        asset_tools.verify_runtime()


class RuntimeAssetTests(unittest.TestCase):
    def verify_runtime(self, manifest, root):
        verifier = getattr(asset_tools, 'verify_runtime', None)
        self.assertTrue(callable(verifier), 'A runtime-only verifier is required for checkouts without local archives')
        verifier(manifest, root)

    def fixture(self, root):
        # A single triangle with hand-derived dimensions, with no archive directories.
        binary = struct.pack('<9f', 0, 0, 0, 1, 0, 0, 0, 2, 0)
        document = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': 36}],
                    'bufferViews': [{'buffer': 0, 'byteLength': 36}],
                    'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 2, 0]}],
                    'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}]}
        payload = json.dumps(document).encode()
        payload += b' ' * (-len(payload) % 4)
        data = struct.pack('<4sII', b'glTF', 2, 28 + len(payload) + len(binary)) + struct.pack('<I4s', len(payload), b'JSON') + payload + struct.pack('<I4s', len(binary), b'BIN\0') + binary
        catalog = {'schemaVersion': 1, 'foods': [{'id': 'new-food', 'runtimePrefix': 'special', 'stageCount': 1,
                    'stages': [{'bites': 3, 'calibration': {'scale': 1, 'position': [0, 0, 0], 'yaw': 0}}]}]}
        (root / 'assets').mkdir()
        (root / 'assets/catalog.json').write_text(json.dumps(catalog), encoding='utf-8')
        entries = []
        for name in ('public/models-runtime/special-0.glb', 'public/models-runtime/compatible-drink-0.glb'):
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            entries.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'dimensionsMm': [1000, 2000, 0]})
        manifest = {'schemaVersion': 1, 'runtimeRoots': {'unified': 'public/models-runtime'},
                    'runtimeFiles': entries, 'files': [{'source': {'path': 'assets/new-food/source/0.glb'}}]}
        return manifest

    def test_runtime_only_accepts_absent_source_and_processed_archives(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            self.assertFalse((root / 'assets/new-food').exists())
            self.verify_runtime(manifest, root)

    def test_runtime_only_rejects_corrupted_final_model(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            (root / 'public/models-runtime/special-0.glb').write_bytes(b'corrupted')
            with self.assertRaisesRegex(ValueError, 'Runtime hash mismatch'):
                self.verify_runtime(manifest, root)

    def test_runtime_only_rejects_paths_outside_flat_runtime_roots(self):
        for name in ('../outside.glb', 'public/models/special-0.glb', 'public/models-runtime/nested/special-0.glb', 'public/models-runtime/../models-runtime/special-0.glb', 'public/models-mobile/special-0.glb', 'public/models-desktop/special-0.glb', 'public/models-runtime/Special-0.glb', 'public/models-runtime/special-0.GLB'):
            with self.subTest(path=name), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                manifest['runtimeFiles'][0]['path'] = name
                with self.assertRaisesRegex(ValueError, 'Unsafe|runtime path'):
                    self.verify_runtime(manifest, root)

    def test_runtime_only_rejects_nonstandard_runtime_roots(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            manifest['runtimeRoots']['desktop'] = 'public/models'
            with self.assertRaisesRegex(ValueError, 'runtime roots'):
                self.verify_runtime(manifest, root)

    def test_runtime_only_rejects_malformed_manifest_metadata(self):
        cases = [('runtimeRoots', None), ('schemaVersion', 2), ('runtimeFiles', None), ('runtimeFiles', [])]
        for key, bad in cases:
            with self.subTest(key=key, value=bad), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                manifest[key] = bad
                with self.assertRaises(ValueError):
                    self.verify_runtime(manifest, root)
        for key, bad in [('sha256', 'bad-hash'), ('bytes', True), ('dimensionsMm', [1000, float('nan'), 0])]:
            with self.subTest(key=key), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                manifest['runtimeFiles'][0][key] = bad
                with self.assertRaisesRegex(ValueError, 'runtime file metadata'):
                    self.verify_runtime(manifest, root)

    def test_runtime_only_requires_catalog_coverage_and_unique_entries(self):
        for change in ('missing-catalog-model', 'duplicate'):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                if change == 'duplicate':
                    manifest['runtimeFiles'].append(dict(manifest['runtimeFiles'][0]))
                else:
                    manifest['runtimeFiles'].pop(0)
                with self.assertRaisesRegex(ValueError, 'coverage|Duplicate'):
                    self.verify_runtime(manifest, root)

    def test_runtime_only_checks_compatibility_files_and_unlisted_models(self):
        for change in ('missing-compatible', 'unlisted-model'):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                if change == 'missing-compatible':
                    (root / 'public/models-runtime/compatible-drink-0.glb').unlink()
                else:
                    shutil.copyfile(root / 'public/models-runtime/special-0.glb', root / 'public/models-runtime/unlisted-0.glb')
                with self.assertRaisesRegex(ValueError, 'Missing runtime asset|coverage'):
                    self.verify_runtime(manifest, root)

    def test_runtime_only_checks_recorded_size_and_dimensions(self):
        for key, bad in (('bytes', 1), ('dimensionsMm', [1000, 999, 0])):
            with self.subTest(key=key), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                manifest = self.fixture(root)
                manifest['runtimeFiles'][0][key] = bad
                with self.assertRaisesRegex(ValueError, 'Runtime (size|dimension) mismatch'):
                    self.verify_runtime(manifest, root)

    def test_runtime_only_rejects_external_resources_even_with_matching_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            path = root / manifest['runtimeFiles'][0]['path']
            document, binary = read_glb(path)
            document['images'] = [{'uri': 'texture.png'}]
            payload = json.dumps(document).encode()
            payload += b' ' * (-len(payload) % 4)
            data = struct.pack('<4sII', b'glTF', 2, 28 + len(payload) + len(binary)) + struct.pack('<I4s', len(payload), b'JSON') + payload + struct.pack('<I4s', len(binary), b'BIN\0') + binary
            path.write_bytes(data)
            manifest['runtimeFiles'][0].update(sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))
            with self.assertRaisesRegex(ValueError, 'external resources'):
                self.verify_runtime(manifest, root)

    def test_runtime_inventory_cli_updates_final_files_without_archives_and_keeps_provenance(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            expected = manifest.pop('runtimeFiles')
            manifest['processing'] = {'method': 'preserve-local-provenance'}
            manifest['foods'] = [{'id': 'stale-food', 'stages': [{'bites': 6}]}]
            manifest['runtimeRoots'] = {'mobile': 'public/models-mobile', 'desktop': 'public/models-desktop', 'buildSourceReference': 'legacy'}
            manifest_path = root / 'assets/manifest.json'
            manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
            result = subprocess.run([sys.executable, str(ROOT / 'tools/assets.py'), 'inventory', '--runtime-only', '--repo', str(root)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            updated = json.loads(manifest_path.read_text(encoding='utf-8'))
            self.assertEqual(sorted(updated['runtimeFiles'], key=lambda row: row['path']), sorted(expected, key=lambda row: row['path']))
            self.assertEqual(updated['runtimeRoots'], {'unified': 'public/models-runtime'})
            self.assertEqual(updated['files'], manifest['files'])
            self.assertEqual(updated['processing'], manifest['processing'])
            self.assertEqual(updated['foods'], json.loads((root / 'assets/catalog.json').read_text(encoding='utf-8'))['foods'])
            self.assertFalse((root / 'assets/new-food').exists())
            self.verify_runtime(updated, root)

    def test_runtime_only_cli_validates_a_checkout_without_archives(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.fixture(root)
            (root / 'assets/manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            result = subprocess.run([sys.executable, str(ROOT / 'tools/assets.py'), 'verify', '--runtime-only', '--repo', str(root)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('2 runtime GLBs', result.stdout)


if __name__ == '__main__': unittest.main()
