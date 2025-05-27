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
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Input, Button, Icon } from 'react-native-elements';
import { ref, set, get, remove, update, push, onValue, off } from 'firebase/database';
import { database } from './src/firebase';
import { DatePickerModal } from 'react-native-paper-dates';
import { Provider as PaperProvider } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';

function App() {
  // ************ ESTADOS ************ //
  const [todos, setTodos] = useState([]);
  const [deletedTodos, setDeletedTodos] = useState([]);
  const [deletedSubItems, setDeletedSubItems] = useState([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subItemInputs, setSubItemInputs] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [hasAddedTodo, setHasAddedTodo] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingText, setEditingText] = useState({});

  // ************ REFERÊNCIAS ************ //
  const scrollViewRef = useRef(null);

  // ************ EFEITOS ************ //
  useEffect(() => {
    console.log('Iniciando efeito de autenticação...');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadTodos();
      } else {
        signInAnonymously(auth)
          .then((userCredential) => {
            setUser(userCredential.user);
            loadTodos();
          })
          .catch((error) => {
            console.error('Erro ao fazer login anônimo:', error);
            Alert.alert('Erro', 'Não foi possível fazer login');
          });
      }
    });

    return () => unsubscribe();
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

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const todosRef = ref(database, 'todos');
      const unsubscribe = onValue(todosRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const todosArray = Object.entries(data || {}).map(([id, todo]) => ({
            id,
            ...todo,
            subItems: todo.subItems || []
          }));
          setTodos(todosArray);
        } else {
          setTodos([]);
        }
        setIsLoading(false);
      }, (error) => {
        console.error('Erro ao carregar tarefas:', error);
        Alert.alert('Erro', 'Não foi possível carregar as tarefas');
        setTodos([]);
        setIsLoading(false);
      });

      return () => off(todosRef);
    } catch (error) {
      console.error('Erro ao configurar listener:', error);
      Alert.alert('Erro', 'Não foi possível configurar o listener');
      setTodos([]);
      setIsLoading(false);
    }
  };

  // ************ GERENCIAMENTO DE DATA ************ //
  const handleDateChange = (params) => {
    setShowDatePicker(false);
    if (params.date) {
      setDueDate(new Date(params.date));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  // ************ GERENCIAMENTO DE TAREFAS ************ //
  const handleAddTodo = async () => {
    if (input.trim() === '') return;
    
    try {
      setIsLoading(true);
      const todosRef = ref(database, 'todos');
      const newTodoRef = push(todosRef);
      await set(newTodoRef, {
        text: input.trim(),
        category: category.trim(),
        completed: false,
        dueDate: dueDate ? dueDate.getTime() : null,
        subItems: [],
        createdAt: Date.now()
      });
      
      setInput('');
      setCategory('');
      setDueDate(null);
      setHasAddedTodo(true);
      setIsLoading(false);
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a tarefa');
      setIsLoading(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      const todoRef = ref(database, `todos/${id}`);
      const snapshot = await get(todoRef);
      
      if (snapshot.exists()) {
        const todo = snapshot.val();
        const newCompletedState = !todo.completed;
        
        // Atualiza o estado de conclusão da tarefa principal e todos os sub-itens
        const updatedSubItems = (todo.subItems || []).map(subItem => ({
          ...subItem,
          completed: newCompletedState
        }));

        await update(todoRef, { 
          completed: newCompletedState,
          subItems: updatedSubItems
        });
        
        console.log('Status da tarefa e sub-itens atualizados com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da tarefa');
    }
  };

  const toggleEdit = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      const isEditing = !todo.isEditing;

      if (!isEditing) { // Se estiver salvando (botão "Salvar" clicado)
        // Salvar todas as alterações pendentes dos sub-itens
        const todoRef = ref(database, `todos/${id}`);
        const snapshot = await get(todoRef);
        
        if (snapshot.exists()) {
          const currentTodo = snapshot.val();
          const updatedSubItems = currentTodo.subItems.map(sub => {
            const editedText = editingText[`${id}-${sub.id}`];
            return editedText ? { ...sub, text: editedText } : sub;
          });

          await update(todoRef, { subItems: updatedSubItems });
          
          // Limpar todos os textos temporários relacionados a esta tarefa
          setEditingText(prev => {
            const newState = { ...prev };
            Object.keys(newState).forEach(key => {
              if (key.startsWith(`${id}-`)) {
                delete newState[key];
              }
            });
            return newState;
          });
        }
      }

      // Atualizar o estado local
      setTodos(prev =>
        prev.map(todo => {
          if (todo.id === id) {
            return {
              ...todo,
              isEditing,
              subItems: todo.subItems.map(sub => ({
                ...sub,
                isEditing: false
              }))
            };
          }
          return todo;
        })
      );
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações dos sub-itens');
    }
  };

  const handleEdit = (id, newText, newCategory, newDate) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, text: newText, category: newCategory, dueDate: newDate } : todo
      )
    );
  };

  const handleDelete = async (id) => {
    try {
      const todoRef = ref(database, `todos/${id}`);
      const snapshot = await get(todoRef);
      
      if (snapshot.exists()) {
        const todoToDelete = snapshot.val();
        
        // Salva a tarefa no histórico
        setDeletedTodos(prev => [...prev, {
          id,
          ...todoToDelete,
          deletedAt: Date.now()
        }]);

        // Salva os sub-itens no histórico
        if (todoToDelete.subItems && todoToDelete.subItems.length > 0) {
          const newDeletedSubItems = todoToDelete.subItems.map(subItem => ({
            ...subItem,
            parentId: id,
            parentText: todoToDelete.text,
            parentCategory: todoToDelete.category,
            deletedAt: Date.now()
          }));
          setDeletedSubItems(prev => [...prev, ...newDeletedSubItems]);
        }

        // Remove a tarefa do banco de dados
        await remove(todoRef);
        console.log('Tarefa e sub-itens movidos para o histórico com sucesso');
      }
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível deletar a tarefa');
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
      
      // Encontra os sub-itens deletados que pertencem a esta tarefa
      const relatedSubItems = deletedSubItems.filter(sub => sub.parentId === id);
      
      // Restaura a tarefa principal com seus sub-itens originais
      const newTodoRef = ref(database, `todos/${id}`);
      
      // Verifica se a tarefa tem sub-itens no histórico
      const subItemsToRestore = todoData.subItems && todoData.subItems.length > 0 
        ? todoData.subItems 
        : relatedSubItems.map(sub => ({
            id: sub.id,
            text: sub.text,
            completed: false
          }));

      await set(newTodoRef, {
        ...todoData,
        completed: false,
        subItems: subItemsToRestore,
        createdAt: Date.now()
      });

      console.log('Tarefa restaurada com ID:', id);
      console.log('Sub-itens restaurados:', subItemsToRestore);
      
      // Remove a tarefa do histórico de deletados
      setDeletedTodos(prev => prev.filter(t => t.id !== id));

      // Remove os sub-itens relacionados do histórico
      setDeletedSubItems(prev => prev.filter(s => s.parentId !== id));

      Alert.alert('Sucesso', 'Tarefa e seus sub-itens foram restaurados com sucesso!');

    } catch (error) {
      console.error('Erro ao restaurar tarefa:', error);
      Alert.alert('Erro', 'Falha ao restaurar tarefa: ' + error.message);
    }
  };

  const handlePermanentDelete = (id) => {
    try {
      Alert.alert(
        'Confirmação',
        'Tem certeza que deseja excluir permanentemente esta tarefa e seus sub-itens?',
        [
          {
            text: 'Não',
            style: 'cancel'
          },
          {
            text: 'Sim',
            style: 'destructive',
            onPress: () => {
              // Remove a tarefa pai do histórico
              setDeletedTodos(prev => prev.filter(t => t.id !== id));
              
              // Remove todos os sub-itens relacionados do histórico
              setDeletedSubItems(prev => prev.filter(s => s.parentId !== id));
              
              console.log('Tarefa e sub-itens excluídos permanentemente');
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

  const handleAddSubItem = async (todoId, subItemText) => {
    if (subItemText.trim() === '') return;
    
    try {
      const todoRef = ref(database, `todos/${todoId}`);
      const snapshot = await get(todoRef);
      if (snapshot.exists()) {
        const todo = snapshot.val();
        const subItems = todo.subItems || [];
        const newSubItem = {
          text: subItemText,
          completed: false,
          id: Date.now().toString()
        };
        
        // Adiciona o novo sub-item ao estado temporário
        setEditingText(prev => ({
          ...prev,
          [`${todoId}-${newSubItem.id}`]: newSubItem.text
        }));

        subItems.push(newSubItem);
        await update(todoRef, { subItems });
        console.log('Subitem adicionado com sucesso');
        setSubItemInputs(prev => ({ ...prev, [todoId]: '' }));
      }
    } catch (error) {
      console.error('Erro ao adicionar subitem:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o subitem');
    }
  };

  const handleToggleSubItem = async (todoId, subItemId) => {
    try {
      const todoRef = ref(database, `todos/${todoId}`);
      const snapshot = await get(todoRef);
      if (snapshot.exists()) {
        const todo = snapshot.val();
        const updatedSubItems = todo.subItems.map(sub =>
          sub.id === subItemId ? { ...sub, completed: !sub.completed } : sub
        );
        await update(todoRef, { subItems: updatedSubItems });
        console.log('Status do subitem atualizado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar sub-item:', error);
      Alert.alert('Erro', 'Falha ao atualizar sub-item: ' + error.message);
    }
  };

  const handleEditSubItem = async (todoId, subItemId, newText) => {
    try {
      const todoRef = ref(database, `todos/${todoId}`);
      const snapshot = await get(todoRef);
      if (snapshot.exists()) {
        const todo = snapshot.val();
        const updatedSubItems = todo.subItems.map(sub =>
          sub.id === subItemId ? { ...sub, text: newText } : sub
        );
        await update(todoRef, { subItems: updatedSubItems });
        console.log('Sub-item atualizado com sucesso');
        // Limpar o texto temporário após salvar
        setEditingText(prev => {
          const newState = { ...prev };
          delete newState[`${todoId}-${subItemId}`];
          return newState;
        });
        // Desativar modo de edição do sub-item
        toggleEditSubItem(todoId, subItemId);
      }
    } catch (error) {
      console.error('Erro ao editar sub-item:', error);
      Alert.alert('Erro', 'Falha ao editar sub-item: ' + error.message);
    }
  };

  const toggleEditSubItem = (todoId, subItemId) => {
    setTodos(prev =>
      prev.map(todo => {
        if (todo.id === todoId && todo.isEditing) {
          return {
            ...todo,
            subItems: todo.subItems.map(sub =>
              sub.id === subItemId
                ? { ...sub, isEditing: !sub.isEditing }
                : { ...sub, isEditing: false }
            )
          };
        }
        return todo;
      })
    );
  };

  const handleDeleteSubItem = async (todoId, subItemId) => {
    try {
      const todoRef = ref(database, `todos/${todoId}`);
      const snapshot = await get(todoRef);
      if (snapshot.exists()) {
        const todo = snapshot.val();
        const subItemToDelete = todo.subItems.find(s => s.id === subItemId);
        
        if (subItemToDelete) {
          // Salva o sub-item no histórico
          setDeletedSubItems(prev => [...prev, {
            ...subItemToDelete,
            parentId: todoId,
            parentText: todo.text,
            parentCategory: todo.category,
            deletedAt: Date.now()
          }]);

          // Remove o sub-item da tarefa
          const updatedSubItems = todo.subItems.filter(s => s.id !== subItemId);
          await update(todoRef, { subItems: updatedSubItems });
          console.log('Sub-item movido para o histórico com sucesso');
        }
      }
    } catch (error) {
      console.error('Erro ao excluir sub-item:', error);
      Alert.alert('Erro', 'Falha ao excluir sub-item: ' + error.message);
    }
  };

  const handleRestoreSubItem = async (subItem) => {
    try {
      const todoRef = ref(database, `todos/${subItem.parentId}`);
      const snapshot = await get(todoRef);
      
      if (!snapshot.exists()) {
        const newTodoRef = ref(database, `todos/${subItem.parentId}`);
        await set(newTodoRef, {
          text: subItem.parentText,
          category: subItem.parentCategory,
          completed: false,
          subItems: [{
            id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: subItem.text,
            completed: false
          }],
          createdAt: Date.now()
        });
        
        const parentInHistory = deletedTodos.find(t => t.id === subItem.parentId);
        if (parentInHistory) {
          setDeletedTodos(prev => prev.filter(t => t.id !== subItem.parentId));
        }
        
        Alert.alert('Sucesso', 'Uma nova tarefa foi criada com o sub-item restaurado.');
      } else {
        const todo = snapshot.val();
        const existingSubItems = todo.subItems || [];
        
        if (!existingSubItems.some(item => item.text === subItem.text)) {
          const updatedSubItems = [
            ...existingSubItems,
            {
              id: `subitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: subItem.text,
              completed: false
            }
          ];

          await update(todoRef, { subItems: updatedSubItems });
          console.log('Subitem restaurado com sucesso');
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
  const renderTodoItem = React.useCallback(({ item: todo }) => {
    if (categoryFilter && todo.category !== categoryFilter) return null;

    return (
      <View key={todo.id} style={[styles.todoItem, todo.completed && styles.completedTask]}>
        <View style={styles.todoHeader}>
          <CheckBox
            checked={todo.completed}
            onPress={() => handleComplete(todo.id)}
            containerStyle={styles.mainCheckbox}
          />
          <View style={styles.todoContent}>
            <Text style={[styles.todoText, todo.completed && styles.completed]}>
              {todo.text}
            </Text>
            <View style={styles.todoDetails}>
              <Text style={[styles.todoCategory, todo.completed && styles.completed]}>
                {todo.category}
              </Text>
              {todo.dueDate && (
                <Text style={[styles.todoDueDate, todo.completed && styles.completed]}>
                  Prazo: {formatDate(todo.dueDate)}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.subItemContainer}>
          {todo.subItems && todo.subItems.map((sub) => (
            <View key={sub.id} style={styles.subItem}>
              <CheckBox
                checked={sub.completed}
                onPress={() => handleToggleSubItem(todo.id, sub.id)}
                containerStyle={styles.checkbox}
              />
              {todo.isEditing ? (
                sub.isEditing ? (
                  <TextInput
                    value={editingText[`${todo.id}-${sub.id}`] ?? sub.text}
                    onChangeText={(text) => setEditingText(prev => ({
                      ...prev,
                      [`${todo.id}-${sub.id}`]: text
                    }))}
                    style={styles.subItemInput}
                    autoFocus
                    onBlur={() => {
                      const newText = editingText[`${todo.id}-${sub.id}`];
                      if (newText && newText !== sub.text) {
                        handleEditSubItem(todo.id, sub.id, newText);
                      } else {
                        toggleEditSubItem(todo.id, sub.id);
                      }
                    }}
                    onSubmitEditing={() => {
                      const newText = editingText[`${todo.id}-${sub.id}`];
                      if (newText && newText !== sub.text) {
                        handleEditSubItem(todo.id, sub.id, newText);
                      } else {
                        toggleEditSubItem(todo.id, sub.id);
                      }
                    }}
                  />
                ) : (
                  <Text 
                    style={[styles.subItemText, sub.completed && styles.completed]}
                    onPress={() => toggleEditSubItem(todo.id, sub.id)}
                  >
                    {sub.text}
                  </Text>
                )
              ) : (
                <Text 
                  style={[styles.subItemText, sub.completed && styles.completed]}
                >
                  {sub.text}
                </Text>
              )}
              {todo.isEditing && (
                <TouchableOpacity
                  onPress={() => handleDeleteSubItem(todo.id, sub.id)}
                  style={styles.subItemButton}
                >
                  <Icon
                    name="trash"
                    type="font-awesome"
                    size={16}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {!todo.completed && todo.isEditing && (
            <View style={styles.subItem}>
              <TextInput
                value={subItemInputs[todo.id] || ''}
                onChangeText={(text) => handleSubItemInputChange(todo.id, text)}
                placeholder="Novo sub-item..."
                style={styles.subItemInput}
                onSubmitEditing={() => {
                  const text = subItemInputs[todo.id]?.trim();
                  if (text) {
                    handleAddSubItem(todo.id, text);
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  const text = subItemInputs[todo.id]?.trim();
                  if (text) {
                    handleAddSubItem(todo.id, text);
                  }
                }}
                style={[styles.subItemButton, styles.addSubItemButton]}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={() => {
              if (todo.isEditing) {
                // Apenas desativa o modo de edição sem salvar
                setTodos(prev =>
                  prev.map(t =>
                    t.id === todo.id
                      ? {
                          ...t,
                          isEditing: false,
                          subItems: t.subItems.map(sub => ({
                            ...sub,
                            isEditing: false
                          }))
                        }
                      : t
                  )
                );
                // Limpa os textos temporários de edição
                setEditingText(prev => {
                  const newState = { ...prev };
                  Object.keys(newState).forEach(key => {
                    if (key.startsWith(`${todo.id}-`)) {
                      delete newState[key];
                    }
                  });
                  return newState;
                });
              } else {
                handleComplete(todo.id);
              }
            }}
            style={[styles.actionButton, styles.completeButton]}
          >
            <Text style={styles.buttonText}>
              {todo.isEditing ? 'Desfazer' : (todo.completed ? 'Desfazer' : 'Completar')}
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
  }, [categoryFilter, handleComplete, handleToggleSubItem, handleEditSubItem, toggleEditSubItem, handleDeleteSubItem, subItemInputs, handleSubItemInputChange, handleAddSubItem, editingText]);

  // ************ RENDERIZAÇÃO PRINCIPAL ************ //
  return (
    <PaperProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainContainer}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.contentContainer}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Gerenciador de Tarefas</Text>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setShowHistory(true)}
                >
                  <Text style={styles.buttonText}>Histórico</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mainContent}>
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
                  data={todos}
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
                  ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>
                      {isLoading ? 'Carregando...' : 'Nenhuma tarefa encontrada'}
                    </Text>
                  )}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={10}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                />
              </View>
            </View>
          </KeyboardAvoidingView>

          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingButtonText}>+</Text>
          </TouchableOpacity>

          <Modal
            visible={showModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowModal(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>Nova Tarefa</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nova tarefa"
                    value={input}
                    onChangeText={setInput}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Categoria"
                    value={category}
                    onChangeText={setCategory}
                  />
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {dueDate ? formatDate(dueDate) : 'Selecionar data'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      handleAddTodo();
                      setShowModal(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Adicionar Tarefa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          <Modal
            visible={showHistory}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowHistory(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>Histórico de Exclusões</Text>
                <ScrollView style={{ maxHeight: 400 }}>
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
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowHistory(false)}
                >
                  <Text style={styles.buttonText}>Fechar Histórico</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <DatePickerModal
            visible={showDatePicker}
            onDismiss={() => setShowDatePicker(false)}
            date={dueDate || new Date()}
            onConfirm={handleDateChange}
            mode="single"
            locale="pt-BR"
            presentationStyle="pageSheet"
            validRange={{
              startDate: new Date(),
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano a partir de hoje
            }}
          />
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  historyButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 5,
  },
  mainContent: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollContainer: {
    flex: 1,
  },
  todoList: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 100, // Espaço para o botão flutuante
  },
  todoItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  completedTask: {
    backgroundColor: '#f8f9fa',
    borderLeftColor: '#bdc3c7',
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainCheckbox: {
    padding: 0,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    width: 35,
  },
  todoContent: {
    flex: 1,
  },
  editContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  todoCategory: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
    color: '#95a5a6',
  },
  subItemContainer: {
    marginLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: '#eee',
    paddingLeft: 10,
    marginTop: 8,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 40,
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
    backgroundColor: 'white',
    minHeight: 36,
    color: '#34495e',
  },
  subItemText: {
    flex: 1,
    fontSize: 14,
    color: '#34495e',
    padding: 8,
  },
  subItemButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
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
    padding: 15,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    color: '#34495e',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  historyButtons: {
    flexDirection: 'row',
  },
  restoreButton: {
    backgroundColor: '#27ae60',
    padding: 6,
    borderRadius: 5,
    marginLeft: 8,
  },
  deleteForeverButton: {
    backgroundColor: '#e74c3c',
    padding: 6,
    borderRadius: 5,
    marginLeft: 8,
  },
  closeModalButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#2980b9',
  },
  dateInput: {
    backgroundColor: 'white',
    marginBottom: 10,
    marginTop: 5,
    width: '80%',
    alignSelf: 'center',
  },
  todoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  todoDueDate: {
    fontSize: 12,
    color: '#e74c3c',
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    padding: 10,
  },
  dateButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  dateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 15,
    width: '100%',
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  showFilter: {
    marginBottom: 10,
  },
  addSubItemButton: {
    backgroundColor: '#3498db',
    width: 'auto',
    paddingHorizontal: 12,
  },
});

export default App; 