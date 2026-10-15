# Modo "testes": o aluno escreve testes e eles precisam passar na implementação certa e
# falhar nas versões com bug. A implementação chega pelo stdin e vira o módulo `alvo` só
# na memória (sem arquivo em disco para os testes lerem e compararem com o gabarito).
import sys, types, unittest, traceback

fonte = sys.stdin.read()
alvo = types.ModuleType("alvo")
try:
    exec(compile(fonte, "<alvo>", "exec"), alvo.__dict__)
except Exception:
    print("FALHOU")
    sys.exit(0)
sys.modules["alvo"] = alvo
del fonte

with open("/tmp/teste_aluno.py") as f:
    codigo_aluno = f.read()
modulo = types.ModuleType("teste_aluno")
try:
    exec(compile(codigo_aluno, "teste_aluno.py", "exec"), modulo.__dict__)
    # Funções test_* soltas (estilo pytest) e classes unittest.TestCase.
    suite = unittest.TestSuite()
    for nome, obj in list(modulo.__dict__.items()):
        if isinstance(obj, type) and issubclass(obj, unittest.TestCase):
            suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(obj))
        elif callable(obj) and nome.startswith("test"):
            suite.addTest(unittest.FunctionTestCase(obj))
    if suite.countTestCases() == 0:
        print("SEM_TESTES")
        sys.exit(0)
    r = unittest.TextTestRunner(stream=sys.stderr, verbosity=0).run(suite)
    print("PASSOU" if r.wasSuccessful() else "FALHOU")
except Exception:
    traceback.print_exc()
    print("FALHOU")
