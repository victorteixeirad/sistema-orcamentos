import threading
import webview
from app import app  # Importa a sua instância do Flask do arquivo app.py

def rodar_flask():
    # Executa o servidor Flask em background na porta 5000
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    # 1. Inicia o Flask em uma thread separada
    t = threading.Thread(target=rodar_flask)
    t.daemon = True
    t.start()

    # 2. Cria a janela nativa de Desktop carregando o sistema
    webview.create_window(
        title='Deziderio - Gestor de Orçamentos e Pintura',
        url='http://127.0.0.1:5000',
        width=1280,
        height=800,
        resizable=True,
        min_size=(900, 600)
    )

    # 3. Inicia o motor gráfico da janela
    webview.start()