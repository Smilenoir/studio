'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useEffect} from 'react';

interface Question {
  id: string;
  group: string;
  type: 'multipleChoice' | 'numerical';
  text: string;
  options: string[];
  correctAnswer: string;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const QuestionEditor = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Omit<Question, 'id'>>({
    group: '',
    type: 'multipleChoice',
    text: '',
    options: [],
    correctAnswer: '',
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    console.log('Questions updated:', questions);
  }, [questions]);

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
  };

  const addQuestion = () => {
    const newId = generateId();
    const questionToAdd: Question = {id: newId, ...newQuestion};
    setQuestions([...questions, questionToAdd]);
    setNewQuestion({group: '', type: 'multipleChoice', text: '', options: [], correctAnswer: ''});
  };

  const startEditing = (id: string) => {
    const questionToEdit = questions.find(q => q.id === id);
    if (questionToEdit) {
      setNewQuestion({...questionToEdit});
      setEditingQuestionId(id);
    }
  };

  const updateQuestion = () => {
    if (editingQuestionId) {
      const updatedQuestions = questions.map(q =>
        q.id === editingQuestionId ? {id: editingQuestionId, ...newQuestion} : q
      );
      setQuestions(updatedQuestions);
      setEditingQuestionId(null);
      setNewQuestion({group: '', type: 'multipleChoice', text: '', options: [], correctAnswer: ''});
    }
  };

  const deleteQuestion = (id: string) => {
    const updatedQuestions = questions.filter(q => q.id !== id);
    setQuestions(updatedQuestions);
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
            <Input
              type="text"
              id="group"
              name="group"
              value={newQuestion.group}
              onChange={handleInputChange}
              placeholder="Enter group name"
            />
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
