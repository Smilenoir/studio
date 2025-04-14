'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from "@/hooks/use-toast"
import {supabase} from "@/lib/supabaseClient";

interface Question {
  id: string;
  group: string;
  type: 'multipleChoice' | 'numerical';
  text: string;
  options: string[];
  correctAnswer: string;
}

interface Group {
  id: string;
  name: string;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const QuestionEditor = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion]: any = useState<Omit<Question, 'id'>>({
    group: '',
    type: '',
    text: '',
    options: [],
    correctAnswer: '',
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);


  useEffect(() => {
    fetchQuestions();
    fetchGroups();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*');
      if (error) {
        console.error('Error fetching questions:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch questions."
        });
        return;
      }
      setQuestions(data || []);
    } catch (error) {
      console.error('Unexpected error fetching questions:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error fetching questions."
      });
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase.from('groups').select('*');
      if (error) {
        console.error('Error fetching groups:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch groups."
        });
        return;
      }
      setGroups(data || []);
    } catch (error) {
      console.error('Unexpected error fetching groups:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error fetching groups."
      });
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    if (name.startsWith('option')) {
      const index = parseInt(name.replace('option', ''), 10);
      const newOptions = [...newQuestion.options];
      newOptions[index] = value;
      setNewQuestion({...newQuestion, options: newOptions});
    } else {
      // Handle other input changes
      setNewQuestion({...newQuestion, [name]: value});
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setNewQuestion({...newQuestion, [name]: value});
    if (name === 'group') {
      setGroupError(null); // Clear group error when a group is selected
    }
    if (name === 'type') {
      setTypeError(null); // Clear type error when a type is selected
    }
  };

  const validateQuestion = (): boolean => {
    let isValid = true;

    if (!newQuestion.group) {
      setGroupError('Please select a group.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a group."
      });
      isValid = false;
    }

    if (!newQuestion.type) {
      setTypeError('Please select a type.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a type."
      });
      isValid = false;
    }

    return isValid;
  };

  const addQuestion = async () => {
    if (!validateQuestion()) {
      return;
    }

    const newId = generateId();
    const questionToAdd: Question = {id: newId, ...newQuestion};

    try {
      const { error } = await supabase
        .from('questions')
        .insert([questionToAdd])
        .select();

      if (error) {
        console.error('Error adding question:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add question."
        });
        return;
      }

      setQuestions([...questions, questionToAdd]);
      setNewQuestion({group: '', type: '', text: '', options: [], correctAnswer: ''});
      toast({
        title: "Success",
        description: "Question added successfully."
      });
    } catch (error) {
      console.error('Unexpected error adding question:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error adding question."
      });
    }
  };

  const startEditing = (id: string) => {
    const questionToEdit = questions.find(q => q.id === id);
    if (questionToEdit) {
      setNewQuestion({...questionToEdit});
      setEditingQuestionId(id);
    }
  };

  const updateQuestion = async () => {
    if (editingQuestionId) {
      try {
        const { error } = await supabase
          .from('questions')
          .update({...newQuestion})
          .eq('id', editingQuestionId)
          .select();

        if (error) {
          console.error('Error updating question:', JSON.stringify(error));
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update question."
          });
          return;
        }

        const updatedQuestions = questions.map(q =>
          q.id === editingQuestionId ? {id: editingQuestionId, ...newQuestion} : q
        );
        setQuestions(updatedQuestions);
        setEditingQuestionId(null);
        setNewQuestion({group: '', type: '', text: '', options: [], correctAnswer: ''});
        toast({
          title: "Success",
          description: "Question updated successfully."
        });
      } catch (error) {
        console.error('Unexpected error updating question:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update question."
        });
      }
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);

      if (error) {
        console.error('Error deleting question:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete question."
        });
        return;
      }

      const updatedQuestions = questions.filter(q => q.id !== id);
      setQuestions(updatedQuestions);
      toast({
        title: "Success",
        description: "Question deleted successfully."
      });
    } catch (error) {
      console.error('Unexpected error deleting question:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete question."
      });
    }
  };

  const addOption = () => {
    setNewQuestion({...newQuestion, options: [...newQuestion.options, '']});
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Question Editor Form */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Question Editor</CardTitle>
          <CardDescription>Create, edit, and manage questions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">

          <div className="grid gap-2">
            <Label htmlFor="group">Group</Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'group')}>
              <SelectTrigger id="group">
                <SelectValue placeholder="Select a group"/>
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  group.id ? (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ) : null
                ))}
              </SelectContent>
            </Select>
            {groupError && <p className="text-red-500">{groupError}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'type')}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select a type"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multipleChoice">Multiple Choice</SelectItem>
                <SelectItem value="numerical">Numerical</SelectItem>
              </SelectContent>
            </Select>
            {typeError && <p className="text-red-500">{typeError}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="text">Question Text</Label>
            <Textarea
              id="text"
              name="text"
              value={newQuestion.text}
              onChange={handleInputChange}
              placeholder="Enter question text"
            />
          </div>

          {newQuestion.type === 'multipleChoice' && (
            <>
              <div className="grid gap-2">
                <Label>Options</Label>
                {newQuestion.options.map((option, index) => (
                  <Input
                    key={index}
                    type="text"
                    name={`option${index}`}
                    value={option}
                    onChange={handleInputChange}
                    placeholder={`Option ${index + 1}`}
                  />
                ))}
                <Button type="button" variant="secondary" onClick={addOption}>Add Option</Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <Select onValueChange={(value) => handleSelectChange(value, 'correctAnswer')}>
                  <SelectTrigger id="correctAnswer">
                    <SelectValue placeholder="Select correct answer"/>
                  </SelectTrigger>
                  <SelectContent>
                    {newQuestion.options.map((option, index) => (
                      <SelectItem key={index} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            type="button"
            onClick={editingQuestionId ? updateQuestion : addQuestion}
          >
            {editingQuestionId ? 'Update Question' : 'Add Question'}
          </Button>
        </CardContent>
      </Card>

      {/* Question List */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Existing Questions</CardTitle>
          <CardDescription>Manage existing questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div>No questions added yet.</div>
          ) : (
            <div className="grid gap-4">
              {questions.map(question => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle>{question.text}</CardTitle>
                    <CardDescription>Group: {question.group}, Type: {question.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button size="sm" onClick={() => startEditing(question.id)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteQuestion(question.id)}>Delete</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
