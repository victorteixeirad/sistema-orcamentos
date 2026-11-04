import os
import sys
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Configuração do Banco de Dados (PostgreSQL no Render ou SQLite Local)
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        import psycopg2.extras
        # Ajusta a URL para o formato exigido pelo SQLAlchemy/psycopg2 se necessário
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1) if DATABASE_URL.startswith("postgres://") else DATABASE_URL
        conn = psycopg2.connect(url)
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn
    else:
        import sqlite3
        if getattr(sys, 'frozen', False):
            caminho_base = os.path.dirname(sys.executable)
        else:
            caminho_base = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(caminho_base, 'banco_deziderio.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_URL:
        # Sintaxe PostgreSQL
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orcamentos (
                id SERIAL PRIMARY KEY,
                orc_number TEXT UNIQUE,
                obra_name TEXT,
                client_name TEXT,
                client_contact TEXT,
                client_doc TEXT,
                client_phone TEXT,
                client_address TEXT,
                orc_date TEXT,
                orc_medicao TEXT,
                payment_method TEXT,
                pix_key TEXT,
                discount DOUBLE PRECISION,
                down_payment DOUBLE PRECISION,
                subtotal DOUBLE PRECISION,
                total_final DOUBLE PRECISION,
                notes TEXT,
                internal_notes TEXT,
                items_json TEXT,
                status TEXT,
                status_updated_at TEXT,
                created_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configuracoes (
                id SERIAL PRIMARY KEY,
                razao_social TEXT,
                cnpj TEXT,
                endereco TEXT,
                telefone TEXT,
                pix_chave TEXT,
                observacoes_padrao TEXT,
                logo_url TEXT,
                qrcode_pix_url TEXT
            )
        ''')
        cursor.execute("SELECT COUNT(*) FROM configuracoes")
        count = cursor.fetchone()
        if count and (count[0] if isinstance(count, tuple) else count['count']) == 0:
            cursor.execute('''
                INSERT INTO configuracoes (razao_social, cnpj, endereco, telefone, pix_chave, observacoes_padrao, logo_url, qrcode_pix_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                "DEZIDERIO - ESPECIALISTA EM PINTURA E ACABAMENTO",
                "30.654.467/0001-16",
                "Rua Renato Pereira de Campos, nº 2489",
                "(17) 99283-5555",
                "30.654.467/0001-16 (CNPJ - Deziderio)",
                "O serviço será executado de forma profissional. Respeitando as normas técnicas dos produtos a serem usados nesse projeto. Fazemos todo o isolamento devido para não causar danos ao imóvel. Buscamos sempre melhoria contínua entregando um projeto com qualidade.",
                "",
                ""
            ))
    else:
        # Sintaxe SQLite original
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orcamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orc_number TEXT UNIQUE,
                obra_name TEXT,
                client_name TEXT,
                client_contact TEXT,
                client_doc TEXT,
                client_phone TEXT,
                client_address TEXT,
                orc_date TEXT,
                orc_medicao TEXT,
                payment_method TEXT,
                pix_key TEXT,
                discount REAL,
                down_payment REAL,
                subtotal REAL,
                total_final REAL,
                notes TEXT,
                internal_notes TEXT,
                items_json TEXT,
                status TEXT,
                status_updated_at TEXT,
                created_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                razao_social TEXT,
                cnpj TEXT,
                endereco TEXT,
                telefone TEXT,
                pix_chave TEXT,
                observacoes_padrao TEXT,
                logo_url TEXT,
                qrcode_pix_url TEXT
            )
        ''')
        cursor.execute("SELECT COUNT(*) FROM configuracoes")
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO configuracoes (razao_social, cnpj, endereco, telefone, pix_chave, observacoes_padrao, logo_url, qrcode_pix_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                "DEZIDERIO - ESPECIALISTA EM PINTURA E ACABAMENTO",
                "30.654.467/0001-16",
                "Rua Renato Pereira de Campos, nº 2489",
                "(17) 99283-5555",
                "30.654.467/0001-16 (CNPJ - Deziderio)",
                "O serviço será executado de forma profissional. Respeitando as normas técnicas dos produtos a serem usados nesse projeto. Fazemos todo o isolamento devido para não causar danos ao imóvel. Buscamos sempre melhoria contínua entregando um projeto com qualidade.",
                "",
                ""
            ))
            
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/configuracoes', methods=['GET', 'POST'])
def gerenciar_configuracoes():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        dados = request.json or {}
        if DATABASE_URL:
            cursor.execute("""
                UPDATE configuracoes SET 
                    razao_social=%s, cnpj=%s, endereco=%s, telefone=%s, pix_chave=%s, observacoes_padrao=%s, logo_url=%s, qrcode_pix_url=%s
                WHERE id = 1
            """, (
                dados.get('razao_social'), dados.get('cnpj'), dados.get('endereco'),
                dados.get('telefone'), dados.get('pix_chave'), dados.get('observacoes_padrao'),
                dados.get('logo_url'), dados.get('qrcode_pix_url')
            ))
        else:
            cursor.execute("""
                UPDATE configuracoes SET 
                    razao_social=?, cnpj=?, endereco=?, telefone=?, pix_chave=?, observacoes_padrao=?, logo_url=?, qrcode_pix_url=?
                WHERE id = 1
            """, (
                dados.get('razao_social'), dados.get('cnpj'), dados.get('endereco'),
                dados.get('telefone'), dados.get('pix_chave'), dados.get('observacoes_padrao'),
                dados.get('logo_url'), dados.get('qrcode_pix_url')
            ))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Configurações atualizadas com sucesso!"})
    
    cursor.execute("SELECT * FROM configuracoes WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        config_dict = {}
    elif DATABASE_URL:
        config_dict = dict(row)
    else:
        config_dict = dict(row)
        
    return jsonify({"status": "success", "config": config_dict})

@app.route('/api/servicos/listar', methods=['GET'])
def listar_servicos():
    # Retorna uma lista vazia ou dados mockados se a tabela de serviços não existir
    # Ajuste conforme a estrutura da sua tabela ou arquivo JSON de serviços
    return jsonify({"status": "success", "servicos": []})

@app.route('/api/salvar', methods=['POST'])
def salvar_orcamento():
    dados = request.json or {}
    orc_number = dados.get('orc_number')
    if not orc_number:
        return jsonify({"status": "error", "message": "Número de orçamento inválido"}), 400

    novo_status = dados.get('status', 'Enviado')
    status_validos = {'Enviado', 'Em andamento', 'Aprovado', 'Recusado'}
    if novo_status not in status_validos:
        return jsonify({"status": "error", "message": "Status inválido."}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        p = '%s' if DATABASE_URL else '?'
        
        cursor.execute(f"SELECT id, status, status_updated_at FROM orcamentos WHERE orc_number = {p}", (orc_number,))
        existente = cursor.fetchone()
        
        if existente:
            est_status = existente[1] if DATABASE_URL else existente['status']
            est_updated = existente[2] if DATABASE_URL else existente['status_updated_at']
            if est_status == 'Aprovado':
                return jsonify({"status": "error", "message": "Este orçamento já foi aprovado e está bloqueado para edição."}), 409

        if DATABASE_URL:
            cursor.execute("SELECT TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI')")
        else:
            cursor.execute("SELECT datetime('now', 'localtime')")
        agora = cursor.fetchone()[0]
        if isinstance(agora, tuple):
            agora = agora[0]

        if existente:
            est_status = existente[1] if DATABASE_URL else existente['status']
            status_updated_at = agora if est_status != novo_status else (est_updated or agora)
            
            if DATABASE_URL:
                cursor.execute("""
                    UPDATE orcamentos SET
                        obra_name=%s, client_name=%s, client_contact=%s, client_doc=%s, client_phone=%s, client_address=%s,
                        orc_date=%s, orc_medicao=%s, payment_method=%s, pix_key=%s, discount=%s, down_payment=%s,
                        subtotal=%s, total_final=%s, notes=%s, internal_notes=%s, items_json=%s, status=%s, status_updated_at=%s
                    WHERE orc_number=%s AND COALESCE(status, '') <> 'Aprovado'
                """, (
                    dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'), dados.get('client_doc'),
                    dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'), dados.get('orc_medicao'),
                    dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'), dados.get('down_payment'),
                    dados.get('subtotal'), dados.get('total_final'), dados.get('notes'), dados.get('internal_notes'),
                    dados.get('items_json'), novo_status, status_updated_at, orc_number
                ))
            else:
                cursor.execute("""
                    UPDATE orcamentos SET
                        obra_name=?, client_name=?, client_contact=?, client_doc=?, client_phone=?, client_address=?,
                        orc_date=?, orc_medicao=?, payment_method=?, pix_key=?, discount=?, down_payment=?,
                        subtotal=?, total_final=?, notes=?, internal_notes=?, items_json=?, status=?, status_updated_at=?
                    WHERE orc_number=? AND COALESCE(status, '') <> 'Aprovado'
                """, (
                    dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'), dados.get('client_doc'),
                    dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'), dados.get('orc_medicao'),
                    dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'), dados.get('down_payment'),
                    dados.get('subtotal'), dados.get('total_final'), dados.get('notes'), dados.get('internal_notes'),
                    dados.get('items_json'), novo_status, status_updated_at, orc_number
                ))
        else:
            if DATABASE_URL:
                cursor.execute("""
                    INSERT INTO orcamentos (
                        orc_number, obra_name, client_name, client_contact, client_doc, client_phone, client_address,
                        orc_date, orc_medicao, payment_method, pix_key, discount, down_payment, subtotal, total_final,
                        notes, internal_notes, items_json, status, status_updated_at, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
                """, (
                    orc_number, dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'),
                    dados.get('client_doc'), dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'),
                    dados.get('orc_medicao'), dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'),
                    dados.get('down_payment'), dados.get('subtotal'), dados.get('total_final'), dados.get('notes'),
                    dados.get('internal_notes'), dados.get('items_json'), novo_status, agora
                ))
            else:
                cursor.execute("""
                    INSERT INTO orcamentos (
                        orc_number, obra_name, client_name, client_contact, client_doc, client_phone, client_address,
                        orc_date, orc_medicao, payment_method, pix_key, discount, down_payment, subtotal, total_final,
                        notes, internal_notes, items_json, status, status_updated_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
                """, (
                    orc_number, dados.get('obra_name'), dados.get('client_name'), dados.get('client_contact'),
                    dados.get('client_doc'), dados.get('client_phone'), dados.get('client_address'), dados.get('orc_date'),
                    dados.get('orc_medicao'), dados.get('payment_method'), dados.get('pix_key'), dados.get('discount'),
                    dados.get('down_payment'), dados.get('subtotal'), dados.get('total_final'), dados.get('notes'),
                    dados.get('internal_notes'), dados.get('items_json'), novo_status, agora
                ))
        conn.commit()
        return jsonify({"status": "success", "message": "Orçamento salvo com sucesso!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/obter/<path:orc_number>', methods=['GET'])
def obter_orcamento(orc_number):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"SELECT * FROM orcamentos WHERE orc_number = {p}", (orc_number,))
        row = cursor.fetchone()
        if row:
            return jsonify({"status": "success", "orcamento": dict(row)})
        return jsonify({"status": "error", "message": "Orçamento não encontrado"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/deletar/<path:orc_number>', methods=['DELETE'])
def deletar_orcamento(orc_number):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        p = '%s' if DATABASE_URL else '?'
        cursor.execute(f"DELETE FROM orcamentos WHERE orc_number = {p}", (orc_number,))
        conn.commit()
        return jsonify({"status": "success", "message": "Orçamento excluído com sucesso!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)