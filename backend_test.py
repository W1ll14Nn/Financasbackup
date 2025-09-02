import requests
import sys
from datetime import datetime
import json

class FinanceAPITester:
    def __init__(self, base_url="https://money-dashboard-26.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_transactions = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_create_transaction(self, tipo, valor, descricao):
        """Test creating a transaction"""
        success, response = self.run_test(
            f"Create {tipo} Transaction",
            "POST",
            "transactions",
            200,
            data={
                "tipo": tipo,
                "valor": valor,
                "descricao": descricao,
                "data": datetime.now().isoformat()
            }
        )
        if success and 'id' in response:
            self.created_transactions.append(response['id'])
            print(f"   Created transaction ID: {response['id']}")
            return response['id']
        return None

    def test_get_transactions(self, mes=None, ano=None):
        """Test getting transactions"""
        params = {}
        if mes and ano:
            params = {"mes": mes, "ano": ano}
        elif ano:
            params = {"ano": ano}
            
        test_name = "Get All Transactions"
        if mes and ano:
            test_name = f"Get Transactions for {mes}/{ano}"
        elif ano:
            test_name = f"Get Transactions for {ano}"
            
        success, response = self.run_test(
            test_name,
            "GET",
            "transactions",
            200,
            params=params
        )
        if success:
            print(f"   Found {len(response)} transactions")
        return success, response

    def test_delete_transaction(self, transaction_id):
        """Test deleting a transaction"""
        success, response = self.run_test(
            "Delete Transaction",
            "DELETE",
            f"transactions/{transaction_id}",
            200
        )
        return success

    def test_create_alert(self, limite_mensal, mes, ano):
        """Test creating an alert configuration"""
        success, response = self.run_test(
            "Create Alert Configuration",
            "POST",
            "alerts",
            200,
            data={
                "limite_mensal": limite_mensal,
                "mes": mes,
                "ano": ano
            }
        )
        return success, response

    def test_get_alerts(self):
        """Test getting all alert configurations"""
        success, response = self.run_test(
            "Get All Alerts",
            "GET",
            "alerts",
            200
        )
        if success:
            print(f"   Found {len(response)} alert configurations")
        return success, response

    def test_get_alert_by_month(self, mes, ano):
        """Test getting alert configuration for specific month"""
        success, response = self.run_test(
            f"Get Alert for {mes}/{ano}",
            "GET",
            f"alerts/{mes}/{ano}",
            200
        )
        return success, response

    def test_monthly_report(self, mes, ano):
        """Test getting monthly report"""
        success, response = self.run_test(
            f"Get Monthly Report for {mes}/{ano}",
            "GET",
            f"reports/{mes}/{ano}",
            200
        )
        if success:
            print(f"   Receitas: {response.get('total_receitas', 0)}")
            print(f"   Despesas: {response.get('total_despesas', 0)}")
            print(f"   Saldo: {response.get('saldo', 0)}")
            print(f"   Limite excedido: {response.get('limite_excedido', False)}")
        return success, response

    def test_dashboard_data(self, ano):
        """Test getting dashboard data for a year"""
        success, response = self.run_test(
            f"Get Dashboard Data for {ano}",
            "GET",
            f"dashboard/{ano}",
            200
        )
        if success:
            print(f"   Year: {response.get('ano')}")
            print(f"   Monthly data points: {len(response.get('dados_mensais', []))}")
        return success, response

def main():
    print("🚀 Starting Finance API Tests")
    print("=" * 50)
    
    tester = FinanceAPITester()
    current_month = datetime.now().month
    current_year = datetime.now().year

    # Test 1: Create sample transactions
    print("\n📝 Testing Transaction Creation")
    receita_id = tester.test_create_transaction("receita", 3500.0, "Salário")
    freelance_id = tester.test_create_transaction("receita", 800.0, "Freelance")
    aluguel_id = tester.test_create_transaction("despesa", 1200.0, "Aluguel")
    supermercado_id = tester.test_create_transaction("despesa", 400.0, "Supermercado")
    transporte_id = tester.test_create_transaction("despesa", 200.0, "Transporte")

    # Test 2: Get transactions
    print("\n📋 Testing Transaction Retrieval")
    tester.test_get_transactions()  # All transactions
    tester.test_get_transactions(mes=current_month, ano=current_year)  # Current month
    tester.test_get_transactions(ano=current_year)  # Current year

    # Test 3: Create alert configuration
    print("\n🚨 Testing Alert Configuration")
    tester.test_create_alert(1000.0, current_month, current_year)
    tester.test_get_alerts()
    tester.test_get_alert_by_month(current_month, current_year)

    # Test 4: Get monthly report (should show limit exceeded)
    print("\n📊 Testing Monthly Report")
    tester.test_monthly_report(current_month, current_year)

    # Test 5: Get dashboard data
    print("\n📈 Testing Dashboard Data")
    tester.test_dashboard_data(current_year)

    # Test 6: Delete one transaction
    print("\n🗑️ Testing Transaction Deletion")
    if tester.created_transactions:
        tester.test_delete_transaction(tester.created_transactions[0])
        # Verify deletion by getting transactions again
        tester.test_get_transactions(mes=current_month, ano=current_year)

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())