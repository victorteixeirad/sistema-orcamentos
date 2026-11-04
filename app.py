import sqlite3
from flask import Flask, render_template, request, jsonify
import os
import sys

# Pega o diretório onde o executável/script está rodando
if getattr(sys, 'frozen', False):
    caminho_base = os.path.dirname(sys.executable)
else:
    caminho_base = os.path.dirname(os.path.abspath(__file__))

db_path = os.path.join(caminho_base, 'banco_deziderio.db')

app = Flask(__name__)
DB_NAME = 'banco.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
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
    
    for col, datatype in [("internal_notes", "TEXT"), ("status_updated_at", "TEXT")]:
        try:
            cursor.execute(f"ALTER TABLE orcamentos ADD COLUMN {col} {datatype}")
        except sqlite3.OperationalError:
            pass

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
    
    for col, datatype in [("logo_url", "TEXT"), ("qrcode_pix_url", "TEXT")]:
        try:
            cursor.execute(f"ALTER TABLE configuracoes ADD COLUMN {col} {datatype}")
        except sqlite3.OperationalError:
            pass

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
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if request.method == 'POST':
        dados = request.json or {}
        cursor.execute("""
            UPDATE configuracoes SET 
                razao_social=?, cnpj=?, endereco=?, telefone=?, pix_chave=?, observacoes_padrao=?, logo_url=?, qrcode_pix_url=?
            WHERE id = 1
        """, (
            dados.get('razao_social'),
            dados.get('cnpj'),
            dados.get('endereco'),
            dados.get('telefone'),
            dados.get('pix_chave'),
            dados.get('observacoes_padrao'),
            dados.get('logo_url'),
            dados.get('qrcode_pix_url')
        ))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Configurações atualizadas com sucesso!"})
    
    cursor.execute("SELECT * FROM configuracoes WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return jsonify({"status": "success", "config": dict(row) if row else {}})

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

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, status_updated_at FROM orcamentos WHERE orc_number = ?", (orc_number,))
        existente = cursor.fetchone()
        if existente and existente[1] == 'Aprovado':
            return jsonify({"status": "error", "message": "Este orçamento já foi aprovado e está bloqueado para edição. Registre apenas comentários internos."}), 409

        cursor.execute("SELECT datetime('now', 'localtime')")
        agora = cursor.fetchone()[0]
        if existente:
            status_updated_at = agora if existente[1] != novo_status else (existente[2] or agora)
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
            if cursor.rowcount == 0:
                return jsonify({"status": "error", "message": "Orçamento aprovado: edição bloqueada."}), 409
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
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/atualizar_status', methods=['POST'])
def atualizar_status_rapido():
    dados = request.json or {}
    orc_number = dados.get('orc_number')
    novo_status = dados.get('status')
    status_validos = {'Enviado', 'Em andamento', 'Aprovado', 'Recusado'}
    if not orc_number or novo_status not in status_validos:
        return jsonify({"status": "error", "message": "Dados incompletos ou status inválido."}), 400

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM orcamentos WHERE orc_number = ?", (orc_number,))
        existente = cursor.fetchone()
        if not existente:
            return jsonify({"status": "error", "message": "Orçamento não encontrado."}), 404
        if existente[0] == 'Aprovado':
            return jsonify({"status": "error", "message": "Orçamento aprovado: o status não pode mais ser alterado."}), 409
        cursor.execute("SELECT datetime('now', 'localtime')")
        agora = cursor.fetchone()[0]
        cursor.execute("UPDATE orcamentos SET status=?, status_updated_at=? WHERE orc_number=? AND COALESCE(status, '') <> 'Aprovado'", (novo_status, agora, orc_number))
        if cursor.rowcount == 0:
            return jsonify({"status": "error", "message": "Orçamento aprovado: alteração bloqueada."}), 409
        conn.commit()
        return jsonify({"status": "success", "message": "Status atualizado com sucesso!"})
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/comentario', methods=['POST'])
def adicionar_comentario_orcamento():
    dados = request.json or {}
    orc_number = (dados.get('orc_number') or '').strip()
    comentario = (dados.get('comentario') or '').strip()
    if not orc_number or not comentario:
        return jsonify({"status": "error", "message": "Informe o orçamento e o comentário."}), 400
    if len(comentario) > 1000:
        return jsonify({"status": "error", "message": "O comentário deve ter no máximo 1.000 caracteres."}), 400

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT status, internal_notes FROM orcamentos WHERE orc_number=?", (orc_number,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "message": "Orçamento não encontrado."}), 404
        if row[0] != 'Aprovado':
            return jsonify({"status": "error", "message": "Esta rota de comentários está disponível para orçamentos aprovados."}), 409
        cursor.execute("SELECT strftime('%d/%m/%Y às %H:%M', 'now', 'localtime')")
        data_hora = cursor.fetchone()[0]
        novo = f"[{data_hora}] {comentario}"
        atual = row[1] or ''
        atualizado = atual + ('\n---\n' if atual else '') + novo
        cursor.execute("UPDATE orcamentos SET internal_notes=? WHERE orc_number=? AND status='Aprovado'", (atualizado, orc_number))
        if cursor.rowcount == 0:
            return jsonify({"status": "error", "message": "Não foi possível registrar o comentário."}), 409
        conn.commit()
        return jsonify({"status": "success", "message": "Comentário registrado.", "internal_notes": atualizado})
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/deletar/<path:orc_number>', methods=['DELETE'])
def deletar_orcamento(orc_number):
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM orcamentos WHERE orc_number = ?", (orc_number,))
        conn.commit()
        return jsonify({"status": "success", "message": "Orçamento excluído com sucesso!"})
    except sqlite3.Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/listar', methods=['GET'])
def listar_orcamentos():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orcamentos ORDER BY id DESC")
        rows = cursor.fetchall()
        return jsonify([dict(r) for r in rows])
    except sqlite3.Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/obter/<path:orc_number>', methods=['GET'])
def obter_orcamento(orc_number):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orcamentos WHERE orc_number = ?", (orc_number,))
        row = cursor.fetchone()

        if row:
            return jsonify({"status": "success", "orcamento": dict(row)})
        return jsonify({"status": "error", "message": "Orçamento não encontrado"}), 404
    except sqlite3.Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)