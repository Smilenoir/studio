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
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Question {
  id: string;
  groupId: string;
  questionType: 'multipleChoice' | 'numerical';
  questionText: string;
  answers: string[];
  correctAnswer: string | null;
  correctNumber: number | null;
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
  const [newQuestion, setNewQuestion] = useState<Omit<Question, 'id'>>({
    groupId: '',
    questionType: '' as 'multipleChoice' | 'numerical',
    questionText: '',
    answers: ['', '', '', ''],
    correctAnswer: null,
    correctNumber: null,
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const {toast} = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [open, setOpen] = React.useState(false)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<string | null>(null);


  useEffect(() => {
    fetchQuestions();
    fetchGroups();
  }, []);

  const fetchQuestions = async () => {
    try {
      let query = supabase.from('questions').select('*');
      if (selectedFilterGroup) {
        query = query.eq('groupId', selectedFilterGroup);
      }
      const {data, error} = await query;
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
        description: "Failed to fetch questions."
      });
    }
  };

  const fetchGroups = async () => {
    try {
      const {data, error} = await supabase.from('groups').select('*');
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
        description: "Failed to fetch questions."
      });
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    if (name.startsWith('answer')) {
      const index = parseInt(name.replace('answer', ''), 10);
      const newAnswers = [...newQuestion.answers];
      newAnswers[index] = value;
      setNewQuestion({...newQuestion, answers: newAnswers});
    } else if (name === 'correctNumber') {
      setNewQuestion({...newQuestion, correctNumber: value === '' ? null : parseInt(value, 10)});
    }
    else {
      setNewQuestion({...newQuestion, [name]: value});
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setNewQuestion(prevQuestion => ({...prevQuestion, [name]: value }));
    if (name === 'groupId') {
      setGroupError(null);
    }
    if (name === 'questionType') {
      setTypeError(null);
      setNewQuestion(prevQuestion => ({
        ...prevQuestion,
        correctAnswer: null,
        correctNumber: null,
        answers: ['', '', '', '']
      }));
    }
  };

  const validateQuestion = (): boolean => {
    let isValid = true;

    if (!newQuestion.groupId) {
      setGroupError('Please select a group.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a group."
      });
      isValid = false;
    }

    if (!newQuestion.questionType) {
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
    const questionToAdd: Question = {
      id: newId,
      ...newQuestion,
    };

    try {
      const { error } = await supabase
        .from('questions')
        .insert([{
          id: questionToAdd.id,
          questionText: questionToAdd.questionText,
          groupId: questionToAdd.groupId,
          questionType: questionToAdd.questionType,
          answers: questionToAdd.answers,
          correctAnswer: questionToAdd.correctAnswer,
          correctNumber: questionToAdd.correctNumber,
        }])
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
      setNewQuestion({
        groupId: '',
        questionType: '' as 'multipleChoice' | 'numerical',
        questionText: '',
        answers: ['', '', '', ''],
        correctAnswer: null,
        correctNumber: null,
      });
      toast({
        title: "Success",
        description: "Question added successfully."
      });
    } catch (error) {
      console.error('Unexpected error adding question:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add question."
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
          .update({
            questionText: newQuestion.questionText,
            groupId: newQuestion.groupId,
            questionType: newQuestion.questionType,
            answers: newQuestion.answers,
            correctAnswer: newQuestion.correctAnswer,
            correctNumber: newQuestion.correctNumber,
          })
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
        setNewQuestion({
          groupId: '',
          questionType: '' as 'multipleChoice' | 'numerical',
          questionText: '',
          answers: ['', '', '', ''],
          correctAnswer: null,
          correctNumber: null,
        });
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

  const confirmDeleteQuestion = (id: string) => {
    setDeletingQuestionId(id);
    setOpen(true);
  };

  const deleteQuestion = async () => {
    if (deletingQuestionId) {
      try {
        const {error} = await supabase.from('questions').delete().eq('id', deletingQuestionId);

        if (error) {
          console.error('Error deleting question:', JSON.stringify(error));
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to add question."
          });
          return;
        }

        const updatedQuestions = questions.filter(q => q.id !== deletingQuestionId);
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
          description: "Failed to add question."
        });
      } finally {
        setOpen(false);
        setDeletingQuestionId(null);
      }
    }
  };

  const selectedGroupName = groups.find(group => group.id === newQuestion.groupId)?.name || '';

  const getGroupName = (groupId: string) => {
    return groups.find(group => group.id === groupId)?.name || 'Unknown Group';
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
            <Label htmlFor="groupId">Group</Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'groupId')}>
              <SelectTrigger id="groupId">
                <SelectValue placeholder="Select a group">{selectedGroupName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupError && <p className="text-red-500">{groupError}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="questionType">Type</Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'questionType')}>
              <SelectTrigger id="questionType">
                <SelectValue placeholder="Select a type">{newQuestion.questionType === 'multipleChoice' ? 'Multiple Choice' : newQuestion.questionType === 'numerical' ? 'Numerical' : ''}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multipleChoice">Multiple Choice</SelectItem>
                <SelectItem value="numerical">Numerical</SelectItem>
              </SelectContent>
            </Select>
            {typeError && <p className="text-red-500">{typeError}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="questionText">Question Text</Label>
            <Textarea
              id="questionText"
              name="questionText"
              value={newQuestion.questionText}
              onChange={handleInputChange}
              placeholder="Enter question text"
            />
          </div>

          {newQuestion.questionType === 'multipleChoice' && (
            <>
              <div className="grid gap-2">
                <Label>Answers</Label>
                {newQuestion.answers.map((answer, index) => (
                  <Input
                    key={index}
                    type="text"
                    name={`answer${index}`}
                    value={answer}
                    onChange={handleInputChange}
                    placeholder={`Answer ${index + 1}`}
                  />
                ))}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <Select onValueChange={(value) => handleSelectChange(value, 'correctAnswer')}>
                  <SelectTrigger id="correctAnswer">
                    <SelectValue placeholder="Select correct answer">{newQuestion.correctAnswer || "Select answer"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {newQuestion.answers.map((answer, index) => (
                      answer ? (
                        <SelectItem key={index} value={answer}>{answer}</SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {newQuestion.questionType === 'numerical' && (
            <div className="grid gap-2">
              <Label htmlFor="correctNumber">Correct Answer</Label>
              <Input
                type="number"
                id="correctNumber"
                name="correctNumber"
                value={newQuestion.correctNumber !== null ? newQuestion.correctNumber.toString() : ''}
                onChange={handleInputChange}
                placeholder="Enter the correct numerical answer"
              />
            </div>
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
          <div className="grid gap-2">
            <Label htmlFor="filterGroup">Filter by Group</Label>
            <Select onValueChange={(value) => {
              setSelectedFilterGroup(value === 'all' ? null : value);
              fetchQuestions();
            }}>
              <SelectTrigger id="filterGroup">
                <SelectValue placeholder="All Groups">
                  {selectedFilterGroup ? getGroupName(selectedFilterGroup) : 'All Groups'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {questions.length === 0 ? (
            <div>No questions added yet.</div>
          ) : (
            <div className="grid gap-4">
              {questions.map(question => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle>{question.questionText}</CardTitle>
                    {question.questionType === 'multipleChoice' && (
                      <CardDescription>Correct Answer: {question.correctAnswer}</CardDescription>
                    )}
                    {question.questionType === 'numerical' && (
                      <CardDescription>Correct Answer: {question.correctNumber}</CardDescription>
                    )}
                    <CardDescription>
                      Group: {getGroupName(question.groupId)}, Type: {question.questionType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button size="sm" onClick={() => startEditing(question.id)}>Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the question and remove its data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteQuestion()}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
