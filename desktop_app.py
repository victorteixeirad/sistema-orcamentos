import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Lê a URL do banco do Render. Se for Render (começa com postgres://), corrige para postgresql:// exigido pelo SQLAlchemy
db_url = os.getenv('DATABASE_URL', 'sqlite:///database.db')
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)