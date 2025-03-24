import React, { useState, useRef, useEffect } from 'react';
import { CheckBox } from 'react-native-elements';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  FlatList, 
  StyleSheet, 
  Modal, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  // ************ ESTADOS ************ //
  const [todos, setTodos] = useState([]);
  const [deletedTodos, setDeletedTodos] = useState([]);
  const [deletedSubItems, setDeletedSubItems] = useState([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('');
  const [subItemInputs, setSubItemInputs] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [hasAddedTodo, setHasAddedTodo] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // ************ REFERÊNCIAS ************ //
  const scrollViewRef = useRef(null);

  // ************ EFEITOS ************ //
  useEffect(() => {
    const categories = [...new Set(todos.map(todo => todo.category))]
      .filter(Boolean)
      .sort();
    setUniqueCategories(categories);
  }, [todos]);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // ************ GERENCIAMENTO DE TAREFAS ************ //
  const handleAddTodo = () => {
    try {
      if (!input || !input.trim() || !category || !category.trim()) {
        console.log('Input ou categoria vazios');
        return;
      }

      const newTodo = {
        id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: input.trim(),
        category: category.trim(),
        isCompleted: false,
        isEditing: false,
        subItems: []
      };

      console.log('Nova tarefa:', newTodo);
      setTodos(prev => [...prev, newTodo]);
      setInput('');
      setCategory('');
      setSubItemInputs(prev => ({ ...prev, [newTodo.id]: '' }));
      setShowFilter(true);
      setHasAddedTodo(true);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
    }
  };

  const handleComplete = (id) => {
    try {
      if (!id) {
        console.log('ID inválido');
        return;
      }

      setTodos(prev =>
        prev.map(todo => {
          if (todo.id === id) {
            const newState = !todo.isCompleted;
            console.log('Atualizando estado da tarefa:', todo.id, newState);
            return {
              ...todo,
              isCompleted: newState,
              subItems: todo.subItems.map(sub => ({ ...sub, isCompleted: newState }))
            };
          }
          return todo;
        })
      );
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
    }
  };

  const toggleEdit = (id) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, isEditing: !todo.isEditing } : todo
      )
    );
  };

  const handleEdit = (id, newText, newCategory) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, text: newText, category: newCategory } : todo
      )
    );
  };

  const handleDelete = (id) => {
    try {
      if (!id) {
        console.log('ID inválido');
        return;
      }

      const todo = todos.find(t => t.id === id);
      if (!todo) {
        console.log('Tarefa não encontrada');
        return;
      }

      console.log('Movendo tarefa para histórico:', todo);
      setDeletedTodos(prev => [...prev, { ...todo, deletedAt: new Date() }]);
      setTodos(prev => prev.filter(t => t.id !== id));
      setSubItemInputs(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
    }
  };

  const handleRestore = (id) => {
    const todo = deletedTodos.find(t => t.id === id);
    if (todo) {
      setTodos(prev => [...prev, todo]);
      setDeletedTodos(prev => prev.filter(t => t.id !== id));
      setTimeout(scrollToBottom, 100);
    }
  };

  const handlePermanentDelete = (id) => {
    try {
      Alert.alert(
        'Confirmação',
        'Tem certeza que deseja excluir permanentemente esta tarefa?',
        [
          {
            text: 'Não',
            style: 'cancel'
          },
          {
            text: 'Sim',
            style: 'destructive',
            onPress: () => {
              setDeletedTodos(prev => prev.filter(t => t.id !== id));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir permanentemente:', error);
      Alert.alert('Erro', String(error.message || 'Erro desconhecido'));
    }
  };

  // ************ GERENCIAMENTO DE SUB-ITENS ************ //
  const handleSubItemInputChange = (todoId, value) => {
    if (typeof value !== 'string') {
      console.log('Valor inválido para sub-item:', value);
      return;
    }
    setSubItemInputs(prev => ({ ...prev, [todoId]: String(value).trim() }));
  };

  const handleAddSubItem = (todoId) => {
    try {
      if (!todoId) {
        console.log('ID da tarefa inválido');
        return;
      }

      const text = subItemInputs[todoId];
      if (typeof text !== 'string' || !text.trim()) {
        console.log('Texto do sub-item inválido:', text);
        return;
      }

      console.log('Adicionando sub-item à tarefa:', todoId);
      setTodos(prev =>
        prev.map(todo =>
          todo.id === todoId
            ? {
                ...todo,
                subItems: [
                  ...todo.subItems,
                  {
                    id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: text.trim(),
                    isCompleted: todo.isCompleted
                  }
                ]
              }
            : todo
        )
      );
      handleSubItemInputChange(todoId, '');
    } catch (error) {
      console.error('Erro ao adicionar sub-item:', error);
      Alert.alert('Erro', String(error.message || 'Erro ao adicionar sub-item'));
    }
  };

  const handleToggleSubItem = (todoId, subItemId) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? {
              ...todo,
              subItems: todo.subItems.map(sub =>
                sub.id === subItemId
                  ? { ...sub, isCompleted: !sub.isCompleted }
                  : sub
              )
            }
          : todo
      )
    );
  };

  const handleEditSubItem = (todoId, subItemId, newText) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? {
              ...todo,
              subItems: todo.subItems.map(sub =>
                sub.id === subItemId ? { ...sub, text: newText } : sub
              )
            }
          : todo
      )
    );
  };

  const handleDeleteSubItem = (todoId, subItemId) => {
    try {
      if (!todoId || !subItemId) {
        console.log('IDs inválidos');
        return;
      }

      const parentTodo = todos.find(todo => todo.id === todoId);
      if (!parentTodo) {
        console.log('Tarefa pai não encontrada');
        return;
      }

      const subItem = parentTodo.subItems.find(s => s.id === subItemId);
      if (!subItem) {
        console.log('Sub-item não encontrado');
        return;
      }

      console.log('Movendo sub-item para histórico:', subItem);
      const deletedSub = {
        ...subItem,
        parentId: todoId,
        parentText: parentTodo.text,
        parentCategory: parentTodo.category,
        deletedAt: new Date()
      };

      setTodos(prev =>
        prev.map(todo =>
          todo.id === todoId
            ? { ...todo, subItems: todo.subItems.filter(s => s.id !== subItemId) }
            : todo
        )
      );

      setDeletedSubItems(prev => [...prev, deletedSub]);
    } catch (error) {
      console.error('Erro ao deletar sub-item:', error);
    }
  };

  const handleRestoreSubItem = (subItemId) => {
    try {
      const subItem = deletedSubItems.find(s => s.id === subItemId);
      if (subItem) {
        const parentExists = todos.some(todo => todo.id === subItem.parentId);
        
        if (!parentExists) {
          const parentInHistory = deletedTodos.find(todo => todo.id === subItem.parentId);
          
          if (parentInHistory) {
            setTodos(prev => [...prev, {
              ...parentInHistory,
              subItems: [{
                id: subItem.id,
                text: String(subItem.text),
                isCompleted: Boolean(subItem.isCompleted)
              }]
            }]);
            setDeletedTodos(prev => prev.filter(t => t.id !== subItem.parentId));
            
            setTimeout(() => {
              Alert.alert(
                'Sucesso',
                'A tarefa principal foi restaurada junto com o sub-item',
                [{ text: 'OK' }]
              );
            }, 100);
          } else {
            const newTodo = {
              id: subItem.parentId,
              text: String(subItem.parentText),
              category: String(subItem.parentCategory),
              isCompleted: false,
              isEditing: false,
              subItems: [{
                id: subItem.id,
                text: String(subItem.text),
                isCompleted: Boolean(subItem.isCompleted)
              }]
            };
            setTodos(prev => [...prev, newTodo]);
          }
        } else {
          setTodos(prev =>
            prev.map(todo =>
              todo.id === subItem.parentId
                ? {
                    ...todo,
                    subItems: [
                      ...todo.subItems,
                      {
                        id: subItem.id,
                        text: String(subItem.text),
                        isCompleted: Boolean(subItem.isCompleted)
                      }
                    ]
                  }
                : todo
            )
          );
        }
        
        setDeletedSubItems(prev => prev.filter(s => s.id !== subItemId));
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Erro ao restaurar sub-item:', error);
      Alert.alert('Erro', String(error.message || 'Erro ao restaurar sub-item'));
    }
  };

  const handlePermanentDeleteSubItem = (subItemId) => {
    try {
      Alert.alert(
        'Confirmação',
        'Tem certeza que deseja excluir permanentemente este sub-item?',
        [
          {
            text: 'Não',
            style: 'cancel'
          },
          {
            text: 'Sim',
            style: 'destructive',
            onPress: () => {
              setDeletedSubItems(prev => prev.filter(s => s.id !== subItemId));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir permanentemente sub-item:', error);
      Alert.alert('Erro', String(error.message || 'Erro desconhecido'));
    }
  };

  // ************ RENDERIZAÇÃO DO ITEM ************ //
  const renderTodoItem = ({ item: todo }) => {
    if (categoryFilter && todo.category !== categoryFilter) return null;

    return (
      <View style={[styles.todoItem, todo.isCompleted && styles.completedTask]}>
        {todo.isEditing ? (
          <View>
            <TextInput
              value={todo.text}
              onChangeText={(text) => handleEdit(todo.id, text, todo.category)}
              style={styles.input}
            />
            <TextInput
              value={todo.category}
              onChangeText={(text) => handleEdit(todo.id, todo.text, text)}
              style={styles.input}
              placeholder="Categoria"
            />
            {todo.subItems.map((sub) => (
              <View key={sub.id} style={styles.subItem}>
                <CheckBox
                  checked={sub.isCompleted}
                  onPress={() => handleToggleSubItem(todo.id, sub.id)}
                  containerStyle={styles.checkbox}
                />
                <TextInput
                  value={sub.text}
                  onChangeText={(text) => handleEditSubItem(todo.id, sub.id, text)}
                  style={styles.subItemInput}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteSubItem(todo.id, sub.id)}
                  style={styles.subItemButton}
                >
                  <Text style={styles.buttonText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.subItem}>
              <TextInput
                value={subItemInputs[todo.id] || ''}
                onChangeText={(text) => handleSubItemInputChange(todo.id, text)}
                placeholder="Novo sub-item..."
                style={styles.subItemInput}
              />
              <TouchableOpacity
                onPress={() => handleAddSubItem(todo.id)}
                style={styles.subItemButton}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.todoText, todo.isCompleted && styles.completed]}>
              {todo.text}
            </Text>
            <Text style={[styles.todoCategory, todo.isCompleted && styles.completed]}>
              {todo.category}
            </Text>
            <View style={styles.subItemContainer}>
              {todo.subItems.map((sub) => (
                <View key={sub.id} style={styles.subItem}>
                  <CheckBox
                    checked={sub.isCompleted}
                    onPress={() => handleToggleSubItem(todo.id, sub.id)}
                    containerStyle={styles.checkbox}
                  />
                  <Text style={[styles.subItemText, sub.isCompleted && styles.completed]}>
                    {sub.text}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubItem(todo.id, sub.id)}
                    style={styles.subItemButton}
                  >
                    <Text style={styles.buttonText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {!todo.isCompleted && (
                <View style={styles.subItem}>
                  <TextInput
                    value={subItemInputs[todo.id] || ''}
                    onChangeText={(text) => handleSubItemInputChange(todo.id, text)}
                    placeholder="Novo sub-item..."
                    style={styles.subItemInput}
                  />
                  <TouchableOpacity
                    onPress={() => handleAddSubItem(todo.id)}
                    style={styles.subItemButton}
                  >
                    <Text style={styles.buttonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={() => handleComplete(todo.id)}
            style={[styles.actionButton, styles.completeButton]}
          >
            <Text style={styles.buttonText}>
              {todo.isCompleted ? 'Desfazer' : 'Completar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleEdit(todo.id)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Text style={styles.buttonText}>
              {todo.isEditing ? 'Salvar' : 'Editar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(todo.id)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Text style={styles.buttonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ************ RENDERIZAÇÃO PRINCIPAL ************ //
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gerenciador de Tarefas</Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <Text style={styles.buttonText}>Histórico</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Nova tarefa..."
              style={styles.input}
            />
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Categoria..."
              style={styles.input}
            />
          </View>
          <TouchableOpacity 
            onPress={handleAddTodo} 
            style={styles.addButton}
          >
            <Text style={styles.buttonText}>Adicionar Tarefa</Text>
          </TouchableOpacity>
        </View>

        {showFilter && todos.length > 0 && (
          <View style={styles.filterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {hasAddedTodo && (
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    !categoryFilter && styles.activeFilter
                  ]}
                  onPress={() => setCategoryFilter('')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    !categoryFilter && styles.activeFilterText
                  ]}>
                    Todas
                  </Text>
                </TouchableOpacity>
              )}
              
              {uniqueCategories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterButton,
                    categoryFilter === cat && styles.activeFilter
                  ]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    categoryFilter === cat && styles.activeFilterText
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <FlatList
          data={todos.filter(todo => !categoryFilter || todo.category === categoryFilter)}
          renderItem={renderTodoItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.todoList}
          style={styles.scrollContainer}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            if (hasAddedTodo) {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        <Modal
          visible={showHistory}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowHistory(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Histórico de Exclusões</Text>
              <Text style={styles.sectionHeader}>Tarefas Removidas</Text>
              {deletedTodos.length === 0 ? (
                <Text style={styles.emptyMessage}>Nenhuma tarefa removida</Text>
              ) : (
                deletedTodos.map(todo => (
                  <View key={todo.id} style={styles.historyItem}>
                    <Text style={styles.historyText}>
                      {todo.text} ({todo.category})
                    </Text>
                    <View style={styles.historyButtons}>
                      <TouchableOpacity
                        onPress={() => handleRestore(todo.id)}
                        style={styles.restoreButton}
                      >
                        <Text style={styles.buttonText}>Restaurar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePermanentDelete(todo.id)}
                        style={styles.deleteForeverButton}
                      >
                        <Text style={styles.buttonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <Text style={styles.sectionHeader}>Sub-itens Removidos</Text>
              {deletedSubItems.length === 0 ? (
                <Text style={styles.emptyMessage}>Nenhum sub-item removido</Text>
              ) : (
                deletedSubItems.map(sub => (
                  <View key={sub.id} style={styles.historyItem}>
                    <Text style={styles.historyText}>
                      {sub.text} (de: {sub.parentText} - {sub.parentCategory})
                    </Text>
                    <View style={styles.historyButtons}>
                      <TouchableOpacity
                        onPress={() => handleRestoreSubItem(sub.id)}
                        style={styles.restoreButton}
                      >
                        <Text style={styles.buttonText}>Restaurar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePermanentDeleteSubItem(sub.id)}
                        style={styles.deleteForeverButton}
                      >
                        <Text style={styles.buttonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowHistory(false)}
              >
                <Text style={styles.buttonText}>Fechar Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 30,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'left',
    flex: 1,
  },
  historyButton: {
    backgroundColor: '#3498db',
    padding: 9,
    borderRadius: 5,
    position: 'right',
    right: 4,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
    marginRight: 20,
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  todoList: {
    paddingBottom: 20,
  },
  todoItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  completedTask: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#bdc3c7',
  },
  todoText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  todoCategory: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
    color: '#95a5a6',
  },
  subItemContainer: {
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#eee',
    paddingLeft: 15,
    marginTop: 10,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    padding: 0,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subItemInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 14,
    marginRight: 8,
  },
  subItemText: {
    flex: 1,
    fontSize: 14,
    color: '#34495e',
  },
  subItemButton: {
    backgroundColor: '#3498db',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#2980b9',
  },
  editButton: {
    backgroundColor: '#f1c40f',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    color: '#34495e',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 10,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  historyButtons: {
    flexDirection: 'row',
  },
  restoreButton: {
    backgroundColor: '#27ae60',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteForeverButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  closeModalButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterScroll: {
    paddingHorizontal: 5,
  },
  filterButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  activeFilter: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  filterButtonText: {
    color: '#2c3e50',
  },
  activeFilterText: {
    color: 'white',
  },
});

export default App; 