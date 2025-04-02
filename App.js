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
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './src/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [user, setUser] = useState(null);

  // ************ REFERÊNCIAS ************ //
  const scrollViewRef = useRef(null);

  // ************ EFEITOS ************ //
  useEffect(() => {
    console.log('Iniciando efeito de autenticação...');
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('Status da autenticação:', user ? 'Autenticado' : 'Não autenticado');
      setUser(user);
      
      const loadTodos = () => {
        console.log('Iniciando carregamento das tarefas...');
        
        try {
          const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
          console.log('Query criada');
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('Snapshot recebido:', snapshot.size, 'documentos');
            
            const todosData = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              console.log('Documento:', doc.id, data);
              
              todosData.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                subItems: data.subItems || []
              });
            });
            
            console.log('Tarefas carregadas:', todosData.length);
            setTodos(todosData);
          }, (error) => {
            console.error('Erro no snapshot:', error);
            if (error.code === 'permission-denied') {
              Alert.alert(
                'Erro de Permissão',
                'Verifique se as regras do Firestore estão configuradas corretamente.'
              );
            } else {
              Alert.alert('Erro', 'Falha ao carregar tarefas: ' + error.message);
            }
          });
          
          return unsubscribe;
        } catch (error) {
          console.error('Erro ao configurar listener:', error);
          Alert.alert('Erro', 'Falha ao configurar listener: ' + error.message);
        }
      };

      const unsubscribeTodos = loadTodos();
      return () => {
        if (unsubscribeTodos) {
          unsubscribeTodos();
        }
      };
    });

    return () => unsubscribeAuth();
  }, []);

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
  const handleAddTodo = async () => {
    try {
      if (!input.trim() || !category.trim()) {
        Alert.alert('Erro', 'Preencha todos os campos');
        return;
      }

      const newTodo = {
        text: input.trim(),
        category: category.trim(),
        isCompleted: false,
        subItems: [],
        createdAt: new Date(),
        userId: user?.uid || 'anonymous'
      };

      const docRef = await addDoc(collection(db, 'todos'), newTodo);
      console.log('Tarefa adicionada com ID:', docRef.id);

      setInput('');
      setCategory('');
      setHasAddedTodo(true);
      setTimeout(scrollToBottom, 100);

    } catch (error) {
      Alert.alert('Erro', 'Falha ao adicionar tarefa: ' + error.message);
    }
  };

  const handleComplete = async (id) => {
    try {
      const todoRef = doc(db, 'todos', id);
      const todo = todos.find(t => t.id === id);
      
      if (!todo) {
        console.error('Tarefa não encontrada no estado local');
        return;
      }

      await updateDoc(todoRef, {
        isCompleted: !todo.isCompleted,
        subItems: (todo.subItems || []).map(sub => ({
          ...sub,
          isCompleted: !todo.isCompleted
        }))
      });
      console.log('Tarefa atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Falha ao atualizar status: ' + error.message);
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

  const handleDelete = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) {
        console.error('Tarefa não encontrada no estado local');
        return;
      }

      Alert.alert(
        'Confirmar Exclusão',
        'Tem certeza que deseja excluir esta tarefa?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                const todoRef = doc(db, 'todos', id);
                await deleteDoc(todoRef);
                console.log('Tarefa excluída com sucesso:', id);

                setDeletedTodos(prev => [...prev, { 
                  ...todo,
                  deletedAt: new Date() 
                }]);
              } catch (error) {
                console.error('Erro ao excluir tarefa:', error);
                Alert.alert('Erro', 'Falha ao excluir tarefa: ' + error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao processar exclusão:', error);
      Alert.alert('Erro', 'Falha ao processar a exclusão: ' + error.message);
    }
  };

  const handleRestore = async (id) => {
    try {
      const todoToRestore = deletedTodos.find(t => t.id === id);
      if (!todoToRestore) {
        console.error('Tarefa não encontrada no histórico');
        return;
      }

      const { deletedAt, ...todoData } = todoToRestore;
      
      const newTodoRef = await addDoc(collection(db, 'todos'), {
        ...todoData,
        createdAt: new Date(),
        subItems: todoData.subItems || [],
        userId: user?.uid || 'anonymous'
      });

      console.log('Tarefa restaurada com ID:', newTodoRef.id);
      setDeletedTodos(prev => prev.filter(t => t.id !== id));

    } catch (error) {
      console.error('Erro ao restaurar tarefa:', error);
      Alert.alert('Erro', 'Falha ao restaurar tarefa: ' + error.message);
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

  const handleAddSubItem = async (todoId) => {
    try {
      const text = subItemInputs[todoId]?.trim();
      if (!text) return;

      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        console.error('Tarefa não encontrada no estado local');
        return;
      }

      const todoRef = doc(db, 'todos', todoId);
      const newSubItem = {
        id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        isCompleted: todo.isCompleted
      };

      await updateDoc(todoRef, {
        subItems: [...(todo.subItems || []), newSubItem]
      });

      handleSubItemInputChange(todoId, '');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao adicionar sub-item: ' + error.message);
    }
  };

  const handleToggleSubItem = async (todoId, subItemId) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        console.error('Tarefa não encontrada no estado local');
        return;
      }

      const todoRef = doc(db, 'todos', todoId);
      const updatedSubItems = (todo.subItems || []).map(sub =>
        sub.id === subItemId ? { ...sub, isCompleted: !sub.isCompleted } : sub
      );
      
      await updateDoc(todoRef, {
        subItems: updatedSubItems
      });
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar sub-item: ' + error.message);
    }
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

  const handleDeleteSubItem = async (todoId, subItemId) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        console.error('Tarefa não encontrada no estado local');
        return;
      }

      const todoRef = doc(db, 'todos', todoId);
      const deletedSub = todo.subItems.find(s => s.id === subItemId);
      const updatedSubItems = todo.subItems.filter(s => s.id !== subItemId);
      
      await updateDoc(todoRef, {
        subItems: updatedSubItems
      });

      if (deletedSub) {
        setDeletedSubItems(prev => [...prev, {
          ...deletedSub,
          parentId: todoId,
          parentText: todo.text,
          parentCategory: todo.category,
          deletedAt: new Date()
        }]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao excluir sub-item: ' + error.message);
    }
  };

  const handleRestoreSubItem = async (subItem) => {
    try {
      const todoRef = doc(db, 'todos', subItem.parentId);
      const todoSnap = await getDoc(todoRef);
      
      if (!todoSnap.exists()) {
        const newTodo = {
          text: subItem.parentText,
          category: subItem.parentCategory,
          isCompleted: false,
          subItems: [{
            id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: subItem.text,
            isCompleted: false
          }],
          createdAt: new Date(),
          userId: user?.uid || 'anonymous'
        };

        await addDoc(collection(db, 'todos'), newTodo);
        
        const parentInHistory = deletedTodos.find(t => t.id === subItem.parentId);
        if (parentInHistory) {
          setDeletedTodos(prev => prev.filter(t => t.id !== subItem.parentId));
        }
        
        Alert.alert('Sucesso', 'Uma nova tarefa foi criada com o sub-item restaurado.');
      } else {
        const todoData = todoSnap.data();
        const existingSubItems = todoData.subItems || [];
        
        if (!existingSubItems.some(item => item.text === subItem.text)) {
          const updatedSubItems = [
            ...existingSubItems,
            {
              id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: subItem.text,
              isCompleted: false
            }
          ];

          await updateDoc(todoRef, {
            subItems: updatedSubItems
          });
        } else {
          Alert.alert('Aviso', 'Este sub-item já existe na tarefa.');
          return;
        }
      }

      setDeletedSubItems(prev => prev.filter(s => 
        !(s.id === subItem.id && s.parentId === subItem.parentId)
      ));

    } catch (error) {
      console.error('Erro ao restaurar sub-item:', error);
      Alert.alert('Erro', 'Falha ao restaurar sub-item: ' + error.message);
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
      <View key={todo.id} style={[styles.todoItem, todo.isCompleted && styles.completedTask]}>
        {todo.isEditing ? (
          <View key={`edit-${todo.id}`}>
            <TextInput
              key={`input-${todo.id}`}
              value={todo.text}
              onChangeText={(text) => handleEdit(todo.id, text, todo.category)}
              style={styles.input}
            />
            <TextInput
              key={`category-${todo.id}`}
              value={todo.category}
              onChangeText={(text) => handleEdit(todo.id, todo.text, text)}
              style={styles.input}
              placeholder="Categoria"
            />
            {todo.subItems.map((sub) => (
              <View key={`sub-${sub.id}`} style={styles.subItem}>
                <CheckBox
                  key={`check-${sub.id}`}
                  checked={sub.isCompleted}
                  onPress={() => handleToggleSubItem(todo.id, sub.id)}
                  containerStyle={styles.checkbox}
                />
                <TextInput
                  key={`subinput-${sub.id}`}
                  value={sub.text}
                  onChangeText={(text) => handleEditSubItem(todo.id, sub.id, text)}
                  style={styles.subItemInput}
                />
                <TouchableOpacity
                  key={`delete-${sub.id}`}
                  onPress={() => handleDeleteSubItem(todo.id, sub.id)}
                  style={styles.subItemButton}
                >
                  <Text style={styles.buttonText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View key={`newsub-${todo.id}`} style={styles.subItem}>
              <TextInput
                key={`newinput-${todo.id}`}
                value={subItemInputs[todo.id] || ''}
                onChangeText={(text) => handleSubItemInputChange(todo.id, text)}
                placeholder="Novo sub-item..."
                style={styles.subItemInput}
              />
              <TouchableOpacity
                key={`add-${todo.id}`}
                onPress={() => handleAddSubItem(todo.id)}
                style={styles.subItemButton}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View key={`view-${todo.id}`}>
            <Text style={[styles.todoText, todo.isCompleted && styles.completed]}>
              {todo.text}
            </Text>
            <Text style={[styles.todoCategory, todo.isCompleted && styles.completed]}>
              {todo.category}
            </Text>
            <View style={styles.subItemContainer}>
              {todo.subItems.map((sub) => (
                <View key={`sub-${sub.id}`} style={styles.subItem}>
                  <CheckBox
                    key={`check-${sub.id}`}
                    checked={sub.isCompleted}
                    onPress={() => handleToggleSubItem(todo.id, sub.id)}
                    containerStyle={styles.checkbox}
                  />
                  <Text style={[styles.subItemText, sub.isCompleted && styles.completed]}>
                    {sub.text}
                  </Text>
                  <TouchableOpacity
                    key={`delete-${sub.id}`}
                    onPress={() => handleDeleteSubItem(todo.id, sub.id)}
                    style={styles.subItemButton}
                  >
                    <Text style={styles.buttonText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {!todo.isCompleted && (
                <View key={`newsub-${todo.id}`} style={styles.subItem}>
                  <TextInput
                    key={`newinput-${todo.id}`}
                    value={subItemInputs[todo.id] || ''}
                    onChangeText={(text) => handleSubItemInputChange(todo.id, text)}
                    placeholder="Novo sub-item..."
                    style={styles.subItemInput}
                  />
                  <TouchableOpacity
                    key={`add-${todo.id}`}
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
            key={`complete-${todo.id}`}
            onPress={() => handleComplete(todo.id)}
            style={[styles.actionButton, styles.completeButton]}
          >
            <Text style={styles.buttonText}>
              {todo.isCompleted ? 'Desfazer' : 'Completar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            key={`edit-${todo.id}`}
            onPress={() => toggleEdit(todo.id)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Text style={styles.buttonText}>
              {todo.isEditing ? 'Salvar' : 'Editar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            key={`delete-${todo.id}`}
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
          keyExtractor={(item) => item.id.toString()}
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
                        onPress={() => handleRestoreSubItem(sub)}
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