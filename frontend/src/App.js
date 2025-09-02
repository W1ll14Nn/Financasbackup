import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Checkbox } from './components/ui/checkbox';
import { AlertTriangle, Plus, TrendingUp, TrendingDown, DollarSign, Settings, Trash2, Calendar, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFixedExpenseOpen, setIsAddFixedExpenseOpen] = useState(false);
  const [isSetLimitOpen, setIsSetLimitOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newTransaction, setNewTransaction] = useState({
    tipo: '',
    valor: '',
    descricao: ''
  });
  const [newFixedExpense, setNewFixedExpense] = useState({
    nome: '',
    valor: '',
    data_vencimento: ''
  });
  const [newLimit, setNewLimit] = useState('');

  // Load data when month/year changes
  useEffect(() => {
    loadMonthlyData();
    loadDashboardData();
  }, [currentMonth, currentYear]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, fixedExpensesRes, reportRes] = await Promise.all([
        axios.get(`${API}/transactions?mes=${currentMonth}&ano=${currentYear}`),
        axios.get(`${API}/fixed-expenses?mes=${currentMonth}&ano=${currentYear}`),
        axios.get(`${API}/reports/${currentMonth}/${currentYear}`)
      ]);
      
      setTransactions(transactionsRes.data);
      setFixedExpenses(fixedExpensesRes.data);
      setMonthlyReport(reportRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/${currentYear}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/transactions`, {
        tipo: newTransaction.tipo,
        valor: parseFloat(newTransaction.valor),
        descricao: newTransaction.descricao,
        data: new Date().toISOString()
      });
      
      setNewTransaction({ tipo: '', valor: '', descricao: '' });
      setIsAddTransactionOpen(false);
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
    }
  };

  const handleAddFixedExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/fixed-expenses`, {
        nome: newFixedExpense.nome,
        valor: parseFloat(newFixedExpense.valor),
        data_vencimento: parseInt(newFixedExpense.data_vencimento),
        mes: currentMonth,
        ano: currentYear
      });
      
      setNewFixedExpense({ nome: '', valor: '', data_vencimento: '' });
      setIsAddFixedExpenseOpen(false);
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao adicionar despesa fixa:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      await axios.delete(`${API}/transactions/${transactionId}`);
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
    }
  };

  const handleDeleteFixedExpense = async (expenseId) => {
    try {
      await axios.delete(`${API}/fixed-expenses/${expenseId}`);
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao deletar despesa fixa:', error);
    }
  };

  const handleToggleFixedExpensePaid = async (expenseId, currentPaidStatus) => {
    try {
      await axios.put(`${API}/fixed-expenses/${expenseId}`, {
        pago: !currentPaidStatus
      });
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao atualizar status da despesa fixa:', error);
    }
  };

  const handleSetLimit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/alerts`, {
        limite_mensal: parseFloat(newLimit),
        mes: currentMonth,
        ano: currentYear
      });
      
      setNewLimit('');
      setIsSetLimitOpen(false);
      loadMonthlyData();
    } catch (error) {
      console.error('Erro ao definir limite:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Prepare chart data
  const chartData = dashboardData ? dashboardData.dados_mensais.map(item => ({
    mes: months[item.mes - 1].substring(0, 3),
    receitas: item.receitas,
    despesas: item.despesas,
    'despesas variáveis': item.despesas_variaveis,
    'despesas fixas': item.despesas_fixas,
    saldo: item.saldo
  })) : [];

  if (loading && !monthlyReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">💰 Controle Financeiro</h1>
          <p className="text-gray-600">Gerencie suas receitas, despesas e gastos fixos com facilidade</p>
        </div>

        {/* Month/Year Selector */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={currentMonth.toString()} onValueChange={(value) => setCurrentMonth(parseInt(value))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={currentYear.toString()} onValueChange={(value) => setCurrentYear(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2022, 2023, 2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Transação</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova receita ou despesa
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={newTransaction.tipo} onValueChange={(value) => setNewTransaction({...newTransaction, tipo: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receita">Receita</SelectItem>
                            <SelectItem value="despesa">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newTransaction.valor}
                          onChange={(e) => setNewTransaction({...newTransaction, valor: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          placeholder="Descrição da transação"
                          value={newTransaction.descricao}
                          onChange={(e) => setNewTransaction({...newTransaction, descricao: e.target.value})}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={!newTransaction.tipo || !newTransaction.valor}>
                          Adicionar
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddFixedExpenseOpen} onOpenChange={setIsAddFixedExpenseOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Calendar className="w-4 h-4 mr-2" />
                      Despesa Fixa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Despesa Fixa</DialogTitle>
                      <DialogDescription>
                        Adicione uma despesa fixa mensal para {months[currentMonth - 1]} {currentYear}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddFixedExpense} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome da Despesa</Label>
                        <Input
                          placeholder="Ex: Aluguel, Financiamento, Internet..."
                          value={newFixedExpense.nome}
                          onChange={(e) => setNewFixedExpense({...newFixedExpense, nome: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newFixedExpense.valor}
                          onChange={(e) => setNewFixedExpense({...newFixedExpense, valor: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Vencimento</Label>
                        <Select value={newFixedExpense.data_vencimento} onValueChange={(value) => setNewFixedExpense({...newFixedExpense, data_vencimento: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Dia do mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                Dia {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={!newFixedExpense.nome || !newFixedExpense.valor || !newFixedExpense.data_vencimento}>
                          Adicionar
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isSetLimitOpen} onOpenChange={setIsSetLimitOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Definir Limite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Definir Limite Mensal</DialogTitle>
                      <DialogDescription>
                        Configure um limite de gastos para {months[currentMonth - 1]} {currentYear}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSetLimit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Limite Mensal</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newLimit}
                          onChange={(e) => setNewLimit(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          Definir Limite
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert for limit exceeded */}
        {monthlyReport?.limite_excedido && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Atenção!</strong> Você excedeu seu limite mensal de {formatCurrency(monthlyReport.limite_configurado)}.
              Gastos totais: {formatCurrency(monthlyReport.total_despesas + monthlyReport.total_despesas_fixas)}.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {monthlyReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Receitas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">
                  {formatCurrency(monthlyReport.total_receitas)}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Despesas Variáveis
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(monthlyReport.total_despesas)}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Despesas Fixas
                </CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(monthlyReport.total_despesas_fixas)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Pagas: {formatCurrency(monthlyReport.despesas_fixas_pagas)}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pendentes
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600">
                  {formatCurrency(monthlyReport.despesas_fixas_pendentes)}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Saldo Final
                </CardTitle>
                <DollarSign className={`h-4 w-4 ${monthlyReport.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${monthlyReport.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(monthlyReport.saldo)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="fixed-expenses">Despesas Fixas</TabsTrigger>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Transações de {months[currentMonth - 1]} {currentYear}</CardTitle>
                <CardDescription>
                  Lista de todas as receitas e despesas variáveis do mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.data)}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.tipo === 'receita' ? 'default' : 'destructive'}>
                              {transaction.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.descricao}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            transaction.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {transaction.tipo === 'receita' ? '+' : '-'}{formatCurrency(transaction.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma transação encontrada para este mês.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixed-expenses">
            <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Despesas Fixas - {months[currentMonth - 1]} {currentYear}</CardTitle>
                <CardDescription>
                  Gerencie suas despesas mensais fixas e controle de pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fixedExpenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Nome da Despesa</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses.map((expense) => (
                        <TableRow key={expense.id} className={expense.pago ? 'opacity-75' : ''}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={expense.pago}
                                onCheckedChange={() => handleToggleFixedExpensePaid(expense.id, expense.pago)}
                              />
                              {expense.pago ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={expense.pago ? 'line-through' : ''}>{expense.nome}</TableCell>
                          <TableCell>Dia {expense.data_vencimento}</TableCell>
                          <TableCell className={`text-right font-medium ${expense.pago ? 'text-gray-500' : 'text-orange-600'}`}>
                            {formatCurrency(expense.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFixedExpense(expense.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma despesa fixa cadastrada para este mês.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Receitas vs Despesas ({currentYear})</CardTitle>
                  <CardDescription>Comparação mensal incluindo despesas fixas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                      <Bar dataKey="despesas variáveis" fill="#ef4444" name="Despesas Variáveis" />
                      <Bar dataKey="despesas fixas" fill="#f97316" name="Despesas Fixas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Line Chart */}
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Evolução do Saldo ({currentYear})</CardTitle>
                  <CardDescription>Variação mensal do saldo final</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={3} name="Saldo Final" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;